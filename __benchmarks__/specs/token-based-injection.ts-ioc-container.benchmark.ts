import {
  ClassToken,
  ConstantToken,
  Container,
  FunctionToken,
  GroupAliasToken,
  GroupInstanceToken,
  Registration as R,
  SingleAliasToken,
  SingleToken,
} from '../../lib';
import type { BenchmarkSpec } from './benchmark-types';

class TsIocBenchmarkTokenRepository {
  readonly name = 'repository';
}

class TsIocBenchmarkTokenPlugin {
  readonly name = 'plugin';
}

const createTokenBasedInjectionContainer = () =>
  new Container()
    .addRegistration(
      R.fromClass(TsIocBenchmarkTokenRepository)
        .bindToKey('TsIocBenchmarkTokenRepository')
        .bindToAlias('TsIocBenchmarkSingleRepository'),
    )
    .addRegistration(
      R.fromClass(TsIocBenchmarkTokenPlugin)
        .bindToKey('TsIocBenchmarkTokenPlugin')
        .bindToAlias('TsIocBenchmarkTokenPluginGroup'),
    );

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
