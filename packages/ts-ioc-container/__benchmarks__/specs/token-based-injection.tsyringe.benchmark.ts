import 'reflect-metadata';
import { container as globalContainer } from 'tsyringe';
import type { BenchmarkSpec } from './benchmark-types';

class TsyringeBenchmarkTokenRepository {
  readonly name = 'repository';
}

const createTokenBasedInjectionContainer = () => {
  const container = globalContainer.createChildContainer();

  container.register('TsyringeBenchmarkTokenRepository', { useClass: TsyringeBenchmarkTokenRepository });
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
  },
};
