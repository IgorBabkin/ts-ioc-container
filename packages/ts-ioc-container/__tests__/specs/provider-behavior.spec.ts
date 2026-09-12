import 'reflect-metadata';
import {
  arg,
  appendArgs,
  appendArgsFn,
  autoResolve,
  AutoResolveModule,
  CannonSingletonApplyTwiceError,
  Container,
  decorate,
  DependencyNotFoundError,
  inject,
  IContainer,
  lazy,
  onResolve,
  Provider,
  ProviderDisposedError,
  register,
  Registration as R,
  namespace,
  scopeAccess,
  SingleToken,
  singleton,
} from '../../lib';

describe('Spec: provider behavior', () => {
  it('resolves providers from classes, values, factories, and keys', () => {
    class Repository {
      readonly source = 'db';
    }

    const container = new Container()
      .addRegistration(R.fromClass(Repository))
      .addRegistration(R.fromValue('test').bindToKey('Environment'))
      .addRegistration(R.fromFn((scope) => `${scope.resolve('Environment')}:service`).bindToKey('ServiceName'))
      .addRegistration(R.fromKey<string>('ServiceName').bindToKey('ServiceAlias'));

    expect(container.resolve<Repository>('Repository')).toBeInstanceOf(Repository);
    expect(container.resolve('Environment')).toBe('test');
    expect(container.resolve('ServiceAlias')).toBe('test:service');
  });

  it('rejects re-applying singleton on a provider that already has one', () => {
    class Service {}

    expect(() => Provider.fromClass(Service).singleton().singleton()).toThrowError(CannonSingletonApplyTwiceError);
  });

  it('rejects resolving or checking access after provider disposal', () => {
    const provider = Provider.fromValue('ready')
      .singleton()
      .addAccessRule(() => true);
    const container = new Container();

    expect(provider.resolve(container, {})).toBe('ready');
    expect(provider.hasAccess({ invocationScope: container, providerScope: container, args: [] })).toBe(true);

    provider.dispose();

    expect(() => provider.resolve(container, {})).toThrowError(ProviderDisposedError);
    expect(() => provider.hasAccess({ invocationScope: container, providerScope: container, args: [] })).toThrowError(
      ProviderDisposedError,
    );
  });

  it('caches singleton results by configured cache key', () => {
    @register(singleton((tenant) => tenant as string))
    class TenantRepository {
      constructor(@inject(arg(0)) readonly tenant: string) {}
    }

    const container = new Container().addRegistration(R.fromClass(TenantRepository));

    const firstA = container.resolve<TenantRepository>('TenantRepository', { args: ['a'] });
    const secondA = container.resolve<TenantRepository>('TenantRepository', { args: ['a'] });
    const firstB = container.resolve<TenantRepository>('TenantRepository', { args: ['b'] });

    expect(firstA).toBe(secondA);
    expect(firstA).not.toBe(firstB);
    expect(firstB.tenant).toBe('b');
  });

  it('parameterizes provider resolution with static, dynamic, and token arguments', () => {
    @register(singleton())
    class RegionConfig {
      readonly region = 'eu';
    }

    @register(appendArgsFn((scope) => [scope.resolve<RegionConfig>('RegionConfig').region, 'billing']))
    class Endpoint {
      constructor(
        @inject(arg(0)) readonly region: string,
        @inject(arg(1)) readonly service: string,
      ) {}
    }

    class UsesTokenArg {
      constructor(@inject(arg(0)) readonly config: RegionConfig) {}
    }

    const ConfigToken = new SingleToken<RegionConfig>('RegionConfig');

    const container = new Container()
      .addRegistration(R.fromClass(RegionConfig))
      .addRegistration(R.fromClass(Endpoint))
      .addRegistration(R.fromClass(UsesTokenArg));

    expect(container.resolve<Endpoint>('Endpoint').region).toBe('eu');
    expect(container.resolve<Endpoint>('Endpoint').service).toBe('billing');
    expect(container.resolve<UsesTokenArg>('UsesTokenArg', { args: [ConfigToken] }).config).toBe(
      container.resolve('RegionConfig'),
    );

    @register(appendArgs('fixed'))
    class FixedEndpoint {
      constructor(
        @inject(arg(0)) readonly runtimeValue: string,
        @inject(arg(1)) readonly fixedValue: string,
      ) {}
    }

    container.addRegistration(R.fromClass(FixedEndpoint));
    const fixedEndpoint = container.resolve<FixedEndpoint>('FixedEndpoint', { args: ['runtime'] });
    expect(fixedEndpoint.runtimeValue).toBe('runtime');
    expect(fixedEndpoint.fixedValue).toBe('fixed');
  });

  it('chains appendArgsFn and appendArgs so both contribute to the final args list', () => {
    class TenantConfig {
      readonly tenant = 'tenant-a';
    }

    @register(appendArgsFn((scope) => [scope.resolve<TenantConfig>('TenantConfig').tenant]), appendArgs('tail'))
    class Endpoint {
      constructor(
        @inject(arg(0)) readonly runtime: string,
        @inject(arg(1)) readonly tenant: string,
        @inject(arg(2)) readonly tail: string,
      ) {}
    }

    const container = new Container().addRegistration(R.fromClass(TenantConfig)).addRegistration(R.fromClass(Endpoint));

    const endpoint = container.resolve<Endpoint>('Endpoint', { args: ['runtime'] });
    expect(endpoint.runtime).toBe('runtime');
    expect(endpoint.tenant).toBe('tenant-a');
    expect(endpoint.tail).toBe('tail');
  });

  it('delays class construction for lazy providers until first access', () => {
    @register(lazy())
    class HeavyService {
      static constructed = 0;

      constructor() {
        HeavyService.constructed += 1;
      }

      get value(): string {
        return 'ready';
      }
    }

    const container = new Container().addRegistration(R.fromClass(HeavyService));

    const service = container.resolve<HeavyService>('HeavyService');

    expect(HeavyService.constructed).toBe(0);
    expect(service.value).toBe('ready');
    expect(HeavyService.constructed).toBe(1);
  });

  it('eagerly creates auto-resolvable providers when their scope is created', () => {
    @register(autoResolve(), singleton())
    class Scheduler {
      static constructed = 0;

      constructor() {
        Scheduler.constructed += 1;
      }
    }

    const lazyApp = new Container().addRegistration(R.fromClass(Scheduler));
    lazyApp.createScope({ tags: ['request'] });

    expect(Scheduler.constructed).toBe(0);

    const eagerApp = new Container().useModule(new AutoResolveModule()).addRegistration(R.fromClass(Scheduler));
    const request = eagerApp.createScope({ tags: ['request'] });

    expect(Scheduler.constructed).toBe(1);
    expect(request.resolve<Scheduler>('Scheduler')).toBe(request.resolve<Scheduler>('Scheduler'));
    expect(Scheduler.constructed).toBe(1);
  });

  it('forwards optional args to eagerly resolved providers', () => {
    @register(autoResolve(), singleton())
    class RequestTracer {
      constructor(@inject(arg(0)) readonly requestId: string = 'none') {}
    }

    const app = new Container().addRegistration(R.fromClass(RequestTracer));

    app.autoResolve();

    expect(app.resolve<RequestTracer>('RequestTracer').requestId).toBe('none');

    const traced = new Container()
      .useModule(new AutoResolveModule({ args: ['request-1'] }))
      .addRegistration(R.fromClass(RequestTracer))
      .createScope({ tags: ['request'] });

    expect(traced.resolve<RequestTracer>('RequestTracer').requestId).toBe('request-1');
  });

  it('restricts visibility and decorates provider results through pipes', () => {
    @register(
      scopeAccess(({ invocationScope }) => invocationScope.hasTag('admin')),
      decorate((service: AdminService) => Object.assign(service, { audited: true })),
    )
    class AdminService {
      readonly role = 'admin';
    }

    const app = new Container({ tags: ['application'] }).addRegistration(R.fromClass(AdminService));

    const adminRequest = app.createScope({ tags: ['request', 'admin'] });
    const publicRequest = app.createScope({ tags: ['request'] });

    expect(adminRequest.resolve<AdminService & { audited: boolean }>('AdminService').audited).toBe(true);
    expect(() => publicRequest.resolve('AdminService')).toThrowError(DependencyNotFoundError);
  });

  it('observes resolved dependencies through onResolve hooks without replacing them', () => {
    const seen: Array<{ dependency: unknown; scope: IContainer }> = [];

    @register(
      onResolve((dependency, scope) => seen.push({ dependency, scope })),
      decorate((service: Tracker) => Object.assign(service, { decorated: true })),
      onResolve((dependency, scope) => {
        seen.push({ dependency, scope });
        return 'ignored' as unknown as void;
      }),
    )
    class Tracker {
      readonly name = 'tracker';
    }

    const app = new Container({ tags: ['application'] }).addRegistration(R.fromClass(Tracker));
    const request = app.createScope({ tags: ['request'] });

    const tracker = request.resolve<Tracker & { decorated: boolean }>('Tracker');

    // The hook cannot swap the dependency out - the decorated instance still reaches the caller.
    expect(tracker).toBeInstanceOf(Tracker);
    expect(tracker.decorated).toBe(true);

    // Hooks run after every decorate mapper, whatever their position in the chain.
    expect(seen).toHaveLength(2);
    expect(seen[0]).toEqual({ dependency: tracker, scope: request });
    expect(seen[1]).toEqual({ dependency: tracker, scope: request });
  });

  it('runs onResolve hooks per resolution, once for a singleton', () => {
    const transient: unknown[] = [];
    const cached: unknown[] = [];

    const container = new Container()
      .addRegistration(R.fromClass(class Transient {}).pipe(onResolve((d) => transient.push(d))))
      .addRegistration(
        R.fromClass(class Cached {}).pipe(
          singleton(),
          onResolve((d) => cached.push(d)),
        ),
      );

    container.resolve('Transient');
    container.resolve('Transient');
    container.resolve('Cached');
    container.resolve('Cached');

    expect(transient).toHaveLength(2);
    expect(cached).toHaveLength(1);
  });

  it('propagates an error thrown by an onResolve hook out of resolve', () => {
    const failure = new Error('hook failed');

    const container = new Container().addRegistration(
      R.fromClass(class Fragile {}).pipe(
        onResolve(() => {
          throw failure;
        }),
      ),
    );

    expect(() => container.resolve('Fragile')).toThrow(failure);
  });

  it('restricts a provider to the module namespace its template covers', () => {
    const ILoggerToken = new SingleToken<Logger>('ILogger');

    @register(ILoggerToken, namespace('/domain/**'))
    class Logger {
      readonly layer = 'domain';
    }

    const container = new Container().addRegistration(R.fromClass(Logger));

    // `__dirname` of the resolving module, plus the key
    expect(ILoggerToken.namespace('/app/src/domain/user').resolve(container).layer).toBe('domain');
    expect(() => ILoggerToken.namespace('/app/src/infra/http').resolve(container)).toThrowError(
      DependencyNotFoundError,
    );
    // A caller which names no namespace is denied as well
    expect(() => container.resolve('ILogger')).toThrowError(DependencyNotFoundError);
  });
});
