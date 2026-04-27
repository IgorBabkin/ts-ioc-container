import 'reflect-metadata';
import { container as globalContainer, Lifecycle } from 'tsyringe';
import type { BenchmarkSpec } from './benchmark-types';

interface TsyringeBenchmarkNotifier {
  channel: string;
}

class TsyringeBenchmarkRepository {
  readonly source = 'db';
}

class TsyringeBenchmarkService {
  constructor(readonly repository: TsyringeBenchmarkRepository) {}
}

class TsyringeBenchmarkEmailNotifier implements TsyringeBenchmarkNotifier {
  readonly channel = 'email';
}

class TsyringeBenchmarkSmsNotifier implements TsyringeBenchmarkNotifier {
  readonly channel = 'sms';
}

const createDependencyRegistrationContainer = () => {
  const container = globalContainer.createChildContainer();

  container.register(
    'TsyringeBenchmarkRepository',
    { useClass: TsyringeBenchmarkRepository },
    { lifecycle: Lifecycle.Singleton },
  );
  container.register('TsyringeBenchmarkConfig', { useValue: { env: 'benchmark' } });
  container.register('TsyringeBenchmarkService', {
    useFactory: (scope) =>
      new TsyringeBenchmarkService(scope.resolve<TsyringeBenchmarkRepository>('TsyringeBenchmarkRepository')),
  });
  container.register('TsyringeBenchmarkServiceAlias', {
    useFactory: (scope) => scope.resolve<TsyringeBenchmarkService>('TsyringeBenchmarkService'),
  });
  container.register('TsyringeBenchmarkSingleNotifier', { useClass: TsyringeBenchmarkEmailNotifier });
  container.register('TsyringeBenchmarkNotifierGroup', { useClass: TsyringeBenchmarkEmailNotifier });
  container.register('TsyringeBenchmarkNotifierGroup', { useClass: TsyringeBenchmarkSmsNotifier });

  return container;
};

export const benchmarkSpec: BenchmarkSpec = {
  prefix: 'dependency-registration.tsyringe',
  name: 'Dependency registration - tsyringe',
  description:
    'Creates a child container with class, value, factory, key redirect, single token, and multi-token registrations.',
  taskName: 'Story: Register and resolve mixed dependency shapes',
  createTask: () => () => {
    const container = createDependencyRegistrationContainer();

    container.resolve<TsyringeBenchmarkRepository>('TsyringeBenchmarkRepository');
    container.resolve<{ env: string }>('TsyringeBenchmarkConfig');
    container.resolve<TsyringeBenchmarkService>('TsyringeBenchmarkServiceAlias');
    container.resolve<TsyringeBenchmarkNotifier>('TsyringeBenchmarkSingleNotifier');
    container.resolveAll<TsyringeBenchmarkNotifier>('TsyringeBenchmarkNotifierGroup');
  },
};
