import { DependencyKey, IContainer, InjectionToken } from './container/IContainer';

export type InstancePredicate = (dep: unknown) => boolean;
export const all: InstancePredicate = () => true;

export const by = {
  alias: {
    some:
      (...aliases: DependencyKey[]) =>
      (с: IContainer, ...args: unknown[]) =>
        с.getTokensByProvider((p) => aliases.some((alias) => p.hasAlias(alias))).map((t) => с.resolve(t, ...args)),

    all:
      (...aliases: DependencyKey[]) =>
      (с: IContainer, ...args: unknown[]) =>
        с.getTokensByProvider((p) => aliases.every((alias) => p.hasAlias(alias))).map((t) => с.resolve(t, ...args)),
  },

  keys:
    (...keys: InjectionToken[]) =>
    (с: IContainer, ...args: unknown[]) =>
      keys.map((t) => с.resolve(t, ...args)),

  key:
    <T>(key: InjectionToken<T>, ...deps: unknown[]) =>
    (c: IContainer, ...args: unknown[]) =>
      c.resolve<T>(key, ...deps, ...args),

  instances:
    (predicate: InstancePredicate = all) =>
    (l: IContainer) =>
      l.getInstances().filter(predicate),

  currentScope: (l: IContainer) => l,

  createScope:
    (...tags: string[]) =>
    (l: IContainer) =>
      l.createScope(...tags),
};
