import 'reflect-metadata';
import {
  addMethodMeta,
  addMethodTag,
  by,
  Container,
  decorate,
  getMethodMeta,
  getMethodTags,
  GroupAliasToken,
  type IContainer,
  type IContainerModule,
  inject,
  ProxyRegistry,
  register,
  Registration as R,
  type RegistrationMapper,
  scope,
  singleton,
  SingleToken,
  unwrapProxy,
} from '../../lib';

/**
 * Mediator - proxy a dependency's calls through a middleware pipeline
 *
 * The container already owns the two things a call pipeline needs: the moment a
 * dependency leaves it (the `decorate(...)` registration pipe) and a way to
 * collect every implementation of an interface (`GroupAliasToken`). Together
 * they make a small engine:
 *
 * - `mediated()` wraps a registered class in a proxy. Each method call becomes a
 *   `MethodCall` message handed to the `Mediator` of the scope that resolved it.
 * - Middleware are ordinary classes registered under `IMiddlewareToken`, resolved
 *   from that same scope - so a middleware can depend on request state (the
 *   current user), and a scope can add one without touching any service.
 * - A middleware decides whether it takes part (`match`) and wraps the rest of
 *   the chain (`next`): it runs code around it, short-circuits it, or maps its
 *   error.
 * - Policies are declared on the methods with method metadata
 *   (`@requiresRole('admin')`, `@cached()`) and read by the middleware that
 *   enforces them, so the service body holds business logic only.
 *
 * Change the terminal step and the same shape is a command bus, a CQRS query
 * pipeline, an RPC client, or an action engine for UI controllers.
 */

// --- The engine ------------------------------------------------------------

type MethodCall = { target: object; method: string; args: unknown[] };
type Next = () => Promise<unknown>;

interface IMiddleware {
  /** Higher runs outer: it sees the call first and the result last. */
  readonly priority: number;
  match(call: MethodCall): boolean;
  handle(call: MethodCall, next: Next): Promise<unknown>;
}

const IMiddlewareToken = new GroupAliasToken<IMiddleware>('IMiddleware');
const middleware = (...mappers: RegistrationMapper<IMiddleware>[]) => register(IMiddlewareToken, ...mappers);

interface IMediator {
  send(call: MethodCall): Promise<unknown>;
}

const IMediatorToken = new SingleToken<IMediator>('IMediator');

// No scope(...): the mediator is built in the scope that asks for it, so the
// middleware list it receives is that scope's.
@register(IMediatorToken)
class Mediator implements IMediator {
  constructor(@inject(by(IMiddlewareToken)) private readonly middlewares: IMiddleware[]) {}

  send(call: MethodCall): Promise<unknown> {
    const chain = this.middlewares.filter((m) => m.match(call)).sort((a, b) => b.priority - a.priority);
    const dispatch = async (i: number): Promise<unknown> =>
      i < chain.length ? chain[i].handle(call, () => dispatch(i + 1)) : invokeMethod(call);
    return dispatch(0);
  }
}

const invokeMethod = ({ target, method, args }: MethodCall): unknown =>
  (target as Record<string, (...a: unknown[]) => unknown>)[method](...args);

/**
 * Routes every method of the resolved instance through the scope's mediator.
 * `ProxyRegistry` keeps `unwrapProxy` and the library's metadata reads working on
 * the proxy, and one wrapper per method keeps `service.place === service.place`.
 */
const mediated = () =>
  decorate((instance: object, resolvingScope: IContainer) => {
    const wrappers = new Map<string, unknown>();
    return ProxyRegistry.getInstance().createProxy(instance, {
      get(target, prop) {
        const value = Reflect.get(target, prop);
        if (typeof prop !== 'string' || typeof value !== 'function') return value;
        if (!wrappers.has(prop)) {
          wrappers.set(prop, (...args: unknown[]) =>
            IMediatorToken.resolve(resolvingScope).send({ target, method: prop, args }),
          );
        }
        return wrappers.get(prop);
      },
    });
  });

// --- Policies, declared on methods -----------------------------------------

const requiresRole = (role: string) => addMethodMeta('requiresRole', () => role);
const cached = () => addMethodTag('cached');

// --- Middleware ------------------------------------------------------------

class ForbiddenError extends Error {}

interface ICurrentUser {
  readonly name: string;
  readonly roles: string[];
}
const ICurrentUserToken = new SingleToken<ICurrentUser>('ICurrentUser');

const IAuditLogToken = new SingleToken<AuditLog>('IAuditLog');

@register(IAuditLogToken, scope((s) => s.hasTag('application')), singleton())
class AuditLog {
  readonly entries: string[] = [];
}

@middleware()
class LoggingMiddleware implements IMiddleware {
  readonly priority = 100;

  constructor(@inject(by(IAuditLogToken)) private readonly audit: AuditLog) {}

  match(): boolean {
    return true;
  }

  async handle({ target, method }: MethodCall, next: Next): Promise<unknown> {
    const name = `${target.constructor.name}.${method}`;
    this.audit.entries.push(`-> ${name}`);
    try {
      const result = await next();
      this.audit.entries.push(`<- ${name}`);
      return result;
    } catch (e) {
      this.audit.entries.push(`x ${name}: ${(e as Error).constructor.name}`);
      throw e;
    }
  }
}

// Built in each request scope, so it sees that request's user.
@middleware()
class AuthorizationMiddleware implements IMiddleware {
  readonly priority = 50;

  constructor(@inject(by(ICurrentUserToken)) private readonly user: ICurrentUser) {}

  match({ target, method }: MethodCall): boolean {
    return getMethodMeta('requiresRole', target, method) !== undefined;
  }

  async handle({ target, method }: MethodCall, next: Next): Promise<unknown> {
    const role = getMethodMeta('requiresRole', target, method) as string;
    if (!this.user.roles.includes(role)) throw new ForbiddenError(`${this.user.name} is not ${role}`);
    return next();
  }
}

// One cache for the whole application, shared by every request.
@middleware(scope((s) => s.hasTag('application')), singleton())
class CacheMiddleware implements IMiddleware {
  readonly priority = 10;
  private readonly cache = new Map<string, unknown>();

  match({ target, method }: MethodCall): boolean {
    return getMethodTags(target, method).has('cached');
  }

  async handle({ target, method, args }: MethodCall, next: Next): Promise<unknown> {
    const key = `${target.constructor.name}.${method}(${JSON.stringify(args)})`;
    if (!this.cache.has(key)) this.cache.set(key, await next());
    return this.cache.get(key);
  }
}

/** The engine as one module: `container.useModule(new MediatorModule())`. */
class MediatorModule implements IContainerModule {
  applyTo(container: IContainer): void {
    container
      .addRegistration(R.fromClass(AuditLog))
      .addRegistration(R.fromClass(Mediator))
      .addRegistration(R.fromClass(LoggingMiddleware))
      .addRegistration(R.fromClass(AuthorizationMiddleware))
      .addRegistration(R.fromClass(CacheMiddleware));
  }
}

// --- A service that knows nothing about any of it --------------------------

interface IOrderService {
  place(item: string): Promise<string>;
  cancel(orderId: string): Promise<void>;
  price(item: string): Promise<number>;
}
const IOrderServiceToken = new SingleToken<IOrderService>('IOrderService');

@register(IOrderServiceToken, mediated())
class OrderService implements IOrderService {
  readonly cancelled: string[] = [];
  priceLookups = 0;

  async place(item: string): Promise<string> {
    return `order:${item}`;
  }

  @requiresRole('admin')
  async cancel(orderId: string): Promise<void> {
    this.cancelled.push(orderId);
  }

  @cached()
  async price(item: string): Promise<number> {
    this.priceLookups++;
    return item.length * 10;
  }
}

describe('Mediator: proxy calls through middleware', () => {
  const createApp = () =>
    new Container({ tags: ['application'] }).useModule(new MediatorModule()).addRegistration(R.fromClass(OrderService));

  const openRequest = (app: IContainer, user: ICurrentUser) =>
    app.createScope({ tags: ['request'] }).addRegistration(R.fromValue(user).bindTo(ICurrentUserToken));

  const alice: ICurrentUser = { name: 'alice', roles: ['admin'] };
  const bob: ICurrentUser = { name: 'bob', roles: [] };

  it('routes a call through the matching middleware and returns its result', async () => {
    const app = createApp();
    const orders = IOrderServiceToken.resolve(openRequest(app, bob));

    expect(await orders.place('book')).toBe('order:book');
    expect(IAuditLogToken.resolve(app).entries).toEqual(['-> OrderService.place', '<- OrderService.place']);
  });

  it('enforces a method policy with the request-scoped user, short-circuiting the body', async () => {
    const app = createApp();
    const asBob = IOrderServiceToken.resolve(openRequest(app, bob));
    const asAlice = IOrderServiceToken.resolve(openRequest(app, alice));

    await expect(asBob.cancel('o-1')).rejects.toBeInstanceOf(ForbiddenError);
    await asAlice.cancel('o-2');

    expect((unwrapProxy(asBob) as OrderService).cancelled).toEqual([]);
    expect((unwrapProxy(asAlice) as OrderService).cancelled).toEqual(['o-2']);
    expect(IAuditLogToken.resolve(app).entries).toEqual([
      '-> OrderService.cancel',
      'x OrderService.cancel: ForbiddenError',
      '-> OrderService.cancel',
      '<- OrderService.cancel',
    ]);
  });

  it('serves a cached result from an application-wide middleware, across requests', async () => {
    const app = createApp();
    const first = IOrderServiceToken.resolve(openRequest(app, bob));
    const second = IOrderServiceToken.resolve(openRequest(app, alice));

    expect(await first.price('book')).toBe(40);
    expect(await second.price('book')).toBe(40);

    expect((unwrapProxy(first) as OrderService).priceLookups).toBe(1);
    expect((unwrapProxy(second) as OrderService).priceLookups).toBe(0);
  });

  it('lets a scope plug in its own middleware by registration alone', async () => {
    @middleware()
    class DryRunMiddleware implements IMiddleware {
      readonly priority = 0; // innermost: logging and authorization still run

      match(): boolean {
        return true;
      }

      async handle(): Promise<unknown> {
        return 'dry-run';
      }
    }

    const app = createApp();
    const dryRun = openRequest(app, alice).addRegistration(R.fromClass(DryRunMiddleware));

    expect(await IOrderServiceToken.resolve(dryRun).place('book')).toBe('dry-run');
    expect(await IOrderServiceToken.resolve(openRequest(app, alice)).place('book')).toBe('order:book');
  });

  it('keeps the proxy transparent: fields, identity of methods, and the real instance', () => {
    const orders = IOrderServiceToken.resolve(openRequest(createApp(), bob)) as OrderService;

    expect(orders.priceLookups).toBe(0); // non-function members are read straight off the target
    expect(orders.place).toBe(orders.place); // one wrapper per method
    expect(orders).toBeInstanceOf(OrderService);
    expect(unwrapProxy(orders)).not.toBe(orders);
  });
});
