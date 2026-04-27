import 'reflect-metadata';
import { container as globalContainer } from 'tsyringe';
import type { BenchmarkSpec } from './benchmark-types';

class TsyringeBenchmarkTokenRepository {
  readonly name = 'repository';
}

class TsyringeBenchmarkTokenPlugin {
  readonly name = 'plugin';
}

const createTokenBasedInjectionContainer = () => {
  const container = globalContainer.createChildContainer();

  container.register('TsyringeBenchmarkTokenRepository', { useClass: TsyringeBenchmarkTokenRepository });
  container.register(TsyringeBenchmarkTokenRepository, { useClass: TsyringeBenchmarkTokenRepository });
  container.register('TsyringeBenchmarkTokenFactory', {
    useFactory: (scope) => scope.resolve<TsyringeBenchmarkTokenRepository>('TsyringeBenchmarkTokenRepository').name,
  });
  container.register('TsyringeBenchmarkTokenConstant', { useValue: 'literal' });
  container.register('TsyringeBenchmarkSingleRepository', {
    useFactory: (scope) => scope.resolve<TsyringeBenchmarkTokenRepository>('TsyringeBenchmarkTokenRepository'),
  });
  container.register('TsyringeBenchmarkTokenPluginGroup', { useClass: TsyringeBenchmarkTokenPlugin });

  return container;
};

export const benchmarkSpec: BenchmarkSpec = {
  prefix: 'token-based-injection.tsyringe',
  name: 'Token-based injection - tsyringe',
  description: 'Resolves string, class, factory, value, alias factory, and multi-token provider shapes.',
  taskName: 'Story: Resolve supported token shapes',
  createTask: () => () => {
    const container = createTokenBasedInjectionContainer();

    container.resolve<TsyringeBenchmarkTokenRepository>('TsyringeBenchmarkTokenRepository');
    container.resolve(TsyringeBenchmarkTokenRepository);
    container.resolve<string>('TsyringeBenchmarkTokenFactory');
    container.resolve<string>('TsyringeBenchmarkTokenConstant');
    container.resolve<TsyringeBenchmarkTokenRepository>('TsyringeBenchmarkSingleRepository');
    container.resolveAll<TsyringeBenchmarkTokenPlugin>('TsyringeBenchmarkTokenPluginGroup');
  },
};
