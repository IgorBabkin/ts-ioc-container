import 'reflect-metadata';
import {
  Container,
  decorate,
  DependencyNotFoundError,
  lazy,
  multiCache,
  Registration as R,
  resolveByArgs,
  setArgs,
  setArgsFn,
  singleton,
  SingleToken,
  scopeAccess,
} from '../../lib';

describe('Spec: provider behavior', () => {
  it('resolves providers from classes, values, factories, and keys', () => {
    class Repository {
      readonly source = 'db';
    }

    const container = new Container()
      .addRegistration(R.fromClass(Repository).bindToKey('Repository'))
      .addRegistration(R.fromValue('test').bindToKey('Environment'))
      .addRegistration(R.fromFn((scope) => `${scope.resolve('Environment')}:service`).bindToKey('ServiceName'))
      .addRegistration(R.fromKey<string>('ServiceName').bindToKey('ServiceAlias'));

    expect(container.resolve<Repository>('Repository')).toBeInstanceOf(Repository);
    expect(container.resolve('Environment')).toBe('test');
    expect(container.resolve('ServiceAlias')).toBe('test:service');
  });

  it('caches singleton results by configured cache key', () => {
    class TenantRepository {
      constructor(readonly tenant: string) {}
    }

    const container = new Container().addRegistration(
      R.fromClass(TenantRepository)
        .bindToKey('TenantRepository')
        .pipe(
          setArgsFn((_, { args = [] } = {}) => args),
          singleton(() => multiCache((tenant) => tenant)),
        ),
    );

    const firstA = container.resolve<TenantRepository>('TenantRepository', { args: ['a'] });
    const secondA = container.resolve<TenantRepository>('TenantRepository', { args: ['a'] });
    const firstB = container.resolve<TenantRepository>('TenantRepository', { args: ['b'] });

    expect(firstA).toBe(secondA);
    expect(firstA).not.toBe(firstB);
    expect(firstB.tenant).toBe('b');
  });

  it('parameterizes provider resolution with static, dynamic, and token arguments', () => {
    class RegionConfig {
      readonly region = 'eu';
    }

    class Endpoint {
      constructor(
        readonly region: string,
        readonly service: string,
      ) {}
    }

    class UsesTokenArg {
      constructor(readonly config: RegionConfig) {}
    }

    const ConfigToken = new SingleToken<RegionConfig>('RegionConfig');

    const container = new Container()
      .addRegistration(R.fromClass(RegionConfig).bindToKey('RegionConfig').pipe(singleton()))
      .addRegistration(
        R.fromClass(Endpoint)
          .bindToKey('Endpoint')
          .pipe(setArgsFn((scope) => [scope.resolve<RegionConfig>('RegionConfig').region, 'billing'])),
      )
      .addRegistration(R.fromClass(UsesTokenArg).bindToKey('UsesTokenArg').pipe(setArgsFn(resolveByArgs)));

    expect(container.resolve<Endpoint>('Endpoint').region).toBe('eu');
    expect(container.resolve<Endpoint>('Endpoint').service).toBe('billing');
    expect(container.resolve<UsesTokenArg>('UsesTokenArg', { args: [ConfigToken] }).config).toBe(
      container.resolve('RegionConfig'),
    );

    class FixedEndpoint {
      constructor(readonly value: string) {}
    }

    container.addRegistration(R.fromClass(FixedEndpoint).bindToKey('FixedEndpoint').pipe(setArgs('fixed')));
    expect(container.resolve<FixedEndpoint>('FixedEndpoint', { args: ['runtime'] }).value).toBe('fixed');
  });

  it('delays class construction for lazy providers until first access', () => {
    class HeavyService {
      static constructed = 0;

      constructor() {
        HeavyService.constructed += 1;
      }

      get value(): string {
        return 'ready';
      }
    }

    const container = new Container().addRegistration(R.fromClass(HeavyService).bindToKey('HeavyService').pipe(lazy()));

    const service = container.resolve<HeavyService>('HeavyService');

    expect(HeavyService.constructed).toBe(0);
    expect(service.value).toBe('ready');
    expect(HeavyService.constructed).toBe(1);
  });

  it('restricts visibility and decorates provider results through pipes', () => {
    class AdminService {
      readonly role = 'admin';
    }

    const app = new Container({ tags: ['application'] }).addRegistration(
      R.fromClass(AdminService)
        .bindToKey('AdminService')
        .pipe(
          scopeAccess(({ invocationScope }) => invocationScope.hasTag('admin')),
          decorate((service) => Object.assign(service, { audited: true })),
        ),
    );

    const adminRequest = app.createScope({ tags: ['request', 'admin'] });
    const publicRequest = app.createScope({ tags: ['request'] });

    expect(adminRequest.resolve<AdminService & { audited: boolean }>('AdminService').audited).toBe(true);
    expect(() => publicRequest.resolve('AdminService')).toThrowError(DependencyNotFoundError);
  });
});
