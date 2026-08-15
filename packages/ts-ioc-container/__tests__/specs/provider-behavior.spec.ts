import 'reflect-metadata';
import {
  args,
  appendArgs,
  appendArgsFn,
  CannonSingletonApplyTwiceError,
  Container,
  decorate,
  DependencyNotFoundError,
  inject,
  lazy,
  Provider,
  ProviderDisposedError,
  register,
  Registration as R,
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
      constructor(@inject(args(0)) readonly tenant: string) {}
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
        @inject(args(0)) readonly region: string,
        @inject(args(1)) readonly service: string,
      ) {}
    }

    class UsesTokenArg {
      constructor(@inject(args(0)) readonly config: RegionConfig) {}
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
        @inject(args(0)) readonly runtimeValue: string,
        @inject(args(1)) readonly fixedValue: string,
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
        @inject(args(0)) readonly runtime: string,
        @inject(args(1)) readonly tenant: string,
        @inject(args(2)) readonly tail: string,
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
});
