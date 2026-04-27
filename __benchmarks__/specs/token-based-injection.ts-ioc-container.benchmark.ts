import {
  bindTo,
  ClassToken,
  ConstantToken,
  Container,
  FunctionToken,
  GroupAliasToken,
  GroupInstanceToken,
  register,
  Registration as R,
  SingleAliasToken,
  SingleToken,
  toGroupAlias,
  toSingleAlias,
} from '../../lib';
import type { BenchmarkSpec } from './benchmark-types';

@register(bindTo(toSingleAlias('TsIocBenchmarkSingleRepository')))
class TsIocBenchmarkTokenRepository {
  readonly name = 'repository';
}

@register(bindTo(toGroupAlias('TsIocBenchmarkTokenPluginGroup')))
class TsIocBenchmarkTokenPlugin {
  readonly name = 'plugin';
}

const createTokenBasedInjectionContainer = () =>
  new Container()
    .addRegistration(R.fromClass(TsIocBenchmarkTokenRepository))
    .addRegistration(R.fromClass(TsIocBenchmarkTokenPlugin));

export const benchmarkSpec: BenchmarkSpec = {
  prefix: 'token-based-injection.ts-ioc-container',
  name: 'Token-based injection - ts-ioc-container',
  description: 'Resolves single, class, function, constant, alias, group alias, and group instance token shapes.',
  taskName: 'Story: Resolve supported token shapes',
  createTask: () => () => {
    const container = createTokenBasedInjectionContainer();

    new SingleToken<TsIocBenchmarkTokenRepository>('TsIocBenchmarkTokenRepository').resolve(container);
    new ClassToken(TsIocBenchmarkTokenRepository).resolve(container);
    new FunctionToken(
      (scope) => scope.resolve<TsIocBenchmarkTokenRepository>('TsIocBenchmarkTokenRepository').name,
    ).resolve(container);
    new ConstantToken('literal').resolve(container);
    new SingleAliasToken<TsIocBenchmarkTokenRepository>('TsIocBenchmarkSingleRepository').resolve(container);
    new GroupAliasToken<TsIocBenchmarkTokenPlugin>('TsIocBenchmarkTokenPluginGroup').resolve(container);
    new GroupInstanceToken((item) => item instanceof TsIocBenchmarkTokenRepository).resolve(container);
  },
};
