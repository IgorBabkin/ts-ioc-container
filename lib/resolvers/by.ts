import { CreateScopeOptions, DependencyKey, IContainer } from '../container/IContainer';
import { all, InstancePredicate } from './InjectionResolver';
import { KeyResolver } from './KeyResolver';
import { InstancesResolver } from './InstancesResolver';
import { AliasManyResolver } from './AliasManyResolver';
import { constructor } from '../utils';
import { ClassResolver } from './ClassResolver';
import { AliasOneResolver } from './AliasOneResolver';
import { OneResolver } from './OneResolver';

export const by = {
  many: <T>(alias: DependencyKey) => new AliasManyResolver<T>(alias),

  one: <T>(key: DependencyKey | constructor<T>) => new OneResolver<T>(key),

  aliasOne: <T>(alias: DependencyKey) => new AliasOneResolver<T>(alias),

  classOne: <T>(Target: constructor<T>) => new ClassResolver<T>(Target),

  keyOne: <T>(Target: DependencyKey) => new KeyResolver<T>(Target),

  instances: (predicate: InstancePredicate = all) => new InstancesResolver(predicate),

  scope: {
    current: (container: IContainer) => container,

    create: (options: CreateScopeOptions) => (l: IContainer) => l.createScope(options),
  },
};
