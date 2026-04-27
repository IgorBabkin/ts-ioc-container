import { Container, decorate, lazy, multiCache, Registration as R, setArgsFn, singleton } from '../../lib';
import type { BenchmarkSpec } from './benchmark-types';

class TsIocBenchmarkTenantRepository {
  constructor(readonly tenant: string) {}
}

class TsIocBenchmarkHeavyService {
  static constructed = 0;

  constructor() {
    TsIocBenchmarkHeavyService.constructed += 1;
  }

  get value(): string {
    return 'ready';
  }
}

class TsIocBenchmarkAdminService {
  readonly role = 'admin';
}

const createProviderBehaviorContainer = () =>
  new Container({ tags: ['admin'] })
    .addRegistration(
      R.fromClass(TsIocBenchmarkTenantRepository)
        .bindToKey('TsIocBenchmarkTenantRepository')
        .pipe(
          setArgsFn((_, { args = [] } = {}) => args),
          singleton(() => multiCache((tenant) => tenant)),
        ),
    )
    .addRegistration(R.fromClass(TsIocBenchmarkHeavyService).bindToKey('TsIocBenchmarkHeavyService').pipe(lazy()))
    .addRegistration(
      R.fromClass(TsIocBenchmarkAdminService)
        .bindToKey('TsIocBenchmarkAdminService')
        .pipe(decorate((service) => Object.assign(service, { audited: true }))),
    );

export const benchmarkSpec: BenchmarkSpec = {
  prefix: 'provider-behavior.ts-ioc-container',
  name: 'Provider behavior - ts-ioc-container',
  description: 'Resolves multi-key singleton cache entries, a lazy class provider, and a decorated provider result.',
  taskName: 'Story: Resolve provider pipe behavior',
  createTask: () => () => {
    const container = createProviderBehaviorContainer();

    container.resolve<TsIocBenchmarkTenantRepository>('TsIocBenchmarkTenantRepository', { args: ['tenant-a'] });
    container.resolve<TsIocBenchmarkTenantRepository>('TsIocBenchmarkTenantRepository', { args: ['tenant-a'] });
    container.resolve<TsIocBenchmarkTenantRepository>('TsIocBenchmarkTenantRepository', { args: ['tenant-b'] });

    const value = container.resolve<TsIocBenchmarkHeavyService>('TsIocBenchmarkHeavyService').value;
    if (value.length === 0) {
      throw new Error('Expected lazy service to resolve a value.');
    }
    container.resolve<TsIocBenchmarkAdminService & { audited: boolean }>('TsIocBenchmarkAdminService');
  },
};
