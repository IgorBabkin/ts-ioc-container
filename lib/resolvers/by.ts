import { CreateScopeOptions, DependencyKey, IContainer, isDependencyKey } from '../container/IContainer';
import { all, InstancePredicate } from './InjectionResolver';
import { KeyResolver } from './KeyResolver';
import { InstancesResolver } from './InstancesResolver';
import { AliasManyResolver } from './AliasManyResolver';
import { constructor } from '../utils';
import { ClassResolver } from './ClassResolver';
import { AliasOneResolver } from './AliasOneResolver';
import { OneResolver } from './OneResolver';
import { DepKey, isDepKey } from '../DepKey';

export const by = {
  many: <T>(target: DependencyKey | DepKey<T>) =>
    new AliasManyResolver<T>(isDependencyKey(target) ? target : target.key),

  one: <T>(target: DependencyKey | constructor<T> | DepKey<T>) =>
    new OneResolver<T>(isDepKey<T>(target) ? target.key : target),

  aliasOne: <T>(target: DependencyKey | DepKey<T>) =>
    new AliasOneResolver<T>(isDepKey<T>(target) ? target.key : target),

  classOne: <T>(Target: constructor<T>) => new ClassResolver<T>(Target),

  keyOne: <T>(target: DependencyKey | DepKey<T>) => new KeyResolver<T>(isDepKey<T>(target) ? target.key : target),

  instances: (predicate: InstancePredicate = all) => new InstancesResolver(predicate),

  scope: {
    current: (container: IContainer) => container,

    create: (options: CreateScopeOptions) => (l: IContainer) => l.createScope(options),
  },
};
