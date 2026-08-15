import { bindTo, Container, register, Registration as R, SingleToken } from '../../lib';
import type { BenchmarkSpec } from './benchmark-types';

const TsIocBenchmarkTokenRepositoryToken = new SingleToken<TsIocBenchmarkTokenRepository>(
  'TsIocBenchmarkTokenRepository',
);

@register(bindTo(TsIocBenchmarkTokenRepositoryToken))
class TsIocBenchmarkTokenRepository {
  readonly name = 'repository';
}

const createTokenBasedInjectionContainer = () =>
  new Container().addRegistration(R.fromClass(TsIocBenchmarkTokenRepository));

export const benchmarkSpec: BenchmarkSpec = {
  prefix: 'token-based-injection.ts-ioc-container',
  name: 'Token-based injection - ts-ioc-container',
  description: 'Resolves single, class, function, constant, alias, group alias, and group instance token shapes.',
  taskName: 'Story: Resolve supported token shapes',
  createTask: () => () => {
    const container = createTokenBasedInjectionContainer();

    TsIocBenchmarkTokenRepositoryToken.resolve(container);
  },
};
