import 'reflect-metadata';
import {
  by,
  Container,
  type DependencyKey,
  type IContainer,
  type IContainerModule,
  inject,
  register,
  Registration as R,
  scope,
  singleton,
  SingleToken,
} from '../../lib';

/**
 * Smoke-testing the container
 *
 * Wiring mistakes are runtime errors: a forgotten registration, or a scope(...)
 * rule which puts a dependency in a scope its consumer cannot see, lets the app
 * boot and throws `DependencyNotFoundError` on the first request that reaches it.
 *
 * A smoke test catches them in CI. It builds the app's real composition root,
 * opens every scope the app opens, and resolves every key in the scope it was
 * registered in. `container.registered` reports each of those (provider, key,
 * scope) - and a child scope copies its parent's listeners, so one subscription
 * on the root sees the whole tree. Subscribe before the modules are applied.
 */

// --- application code ---

interface ILogger {
  log(message: string): void;
}
const ILoggerToken = new SingleToken<ILogger>('ILogger');
const IRequestContextToken = new SingleToken<RequestContext>('IRequestContext');
const IUserServiceToken = new SingleToken<UserService>('IUserService');
const IAuditLogToken = new SingleToken<AuditLog>('IAuditLog');

@register(ILoggerToken, scope((s) => s.hasTag('application')), singleton())
class ConsoleLogger implements ILogger {
  log(_message: string) {}
}

@register(IRequestContextToken, scope((s) => s.hasTag('request')), singleton())
class RequestContext {
  readonly requestId = 'req-1';
}

@register(IUserServiceToken, scope((s) => s.hasTag('request')))
class UserService {
  constructor(
    @inject(by(ILoggerToken)) readonly logger: ILogger,
    @inject(by(IRequestContextToken)) readonly context: RequestContext,
  ) {}
}

// Bug: registered in the application scope, but needs the request context
@register(IAuditLogToken, scope((s) => s.hasTag('application')), singleton())
class AuditLog {
  constructor(@inject(by(IRequestContextToken)) readonly context: RequestContext) {}
}

const appModule: IContainerModule = {
  applyTo: (container) =>
    container
      .addRegistration(R.fromClass(ConsoleLogger))
      .addRegistration(R.fromClass(RequestContext))
      .addRegistration(R.fromClass(UserService)),
};

// The composition root takes its root container, so a test can watch it first.
// Production: bootstrap(new Container({ tags: ['application'] }), appModule)
const bootstrap = (root: IContainer, ...modules: IContainerModule[]) =>
  modules.reduce((container, module) => container.useModule(module), root);

// The scopes the app opens at runtime: one per request, one per transaction
const openScopes = (app: IContainer) => app.createScope({ tags: ['request'] }).createScope({ tags: ['transaction'] });

// --- smoke test helpers ---

/** Records every key registered in the scope tree under `root`, with the scope it landed in. */
function recordRegistrations(root: IContainer): Array<[IContainer, DependencyKey]> {
  const registered: Array<[IContainer, DependencyKey]> = [];
  root.registered.subscribe((_provider, key, scope) => registered.push([scope, key]));
  return registered;
}

/** Resolves each recorded key in its own scope and answers what failed. */
function resolveAll(registered: Array<[IContainer, DependencyKey]>): string[] {
  const failures: string[] = [];
  for (const [scope, key] of registered) {
    try {
      scope.resolve(key);
    } catch (e) {
      failures.push(`${String(key)}: ${(e as Error).message}`);
    }
  }
  return failures;
}

describe('Smoke-testing the container', function () {
  it('resolves every registration in every scope the app opens', function () {
    const root = new Container({ tags: ['application'] });
    const registered = recordRegistrations(root);

    openScopes(bootstrap(root, appModule));

    expect(registered.length).toBeGreaterThan(0);
    expect(resolveAll(registered)).toEqual([]);
  });

  it('catches a dependency registered in a scope that cannot see what it needs', function () {
    const root = new Container({ tags: ['application'] });
    const registered = recordRegistrations(root);
    const auditModule: IContainerModule = {
      applyTo: (container) => container.addRegistration(R.fromClass(AuditLog)),
    };

    // The app boots fine - nothing has asked for AuditLog yet
    openScopes(bootstrap(root, appModule, auditModule));

    expect(resolveAll(registered)).toEqual([expect.stringMatching(/^IAuditLog: Cannot find IRequestContext/)]);
  });

  it('catches a forgotten registration', function () {
    const root = new Container({ tags: ['application'] });
    const registered = recordRegistrations(root);
    // RequestContext was never registered
    const incompleteModule: IContainerModule = {
      applyTo: (container) =>
        container.addRegistration(R.fromClass(ConsoleLogger)).addRegistration(R.fromClass(UserService)),
    };

    openScopes(bootstrap(root, incompleteModule));

    expect(resolveAll(registered)).toEqual([expect.stringMatching(/^IUserService: Cannot find IRequestContext/)]);
  });
});
