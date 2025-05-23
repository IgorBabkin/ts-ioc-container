import { type CreateScopeOptions, type DependencyKey, type IContainer, type Instance } from './container/IContainer';
import { type constructor, Is } from './utils';
import { type DepKey } from './DepKey';
import type { IInjectFnResolver } from './injector/IInjector';
import { ProviderOptions } from './provider/IProvider';

export type InstancePredicate = (dep: unknown) => boolean;
export type ArgsFn = (l: IContainer) => unknown[];

export class InjectionResolver<T> {
  private isLazy: boolean = false;
  private getArgs: ArgsFn = () => [];

  constructor(private resolveByOptions: (s: IContainer, options: ProviderOptions) => T) {}

  args(...deps: unknown[]): this {
    this.getArgs = () => deps;
    return this;
  }

  argsFn(fn: ArgsFn): this {
    this.getArgs = fn;
    return this;
  }

  lazy(): this {
    this.isLazy = true;
    return this;
  }

  resolve(s: IContainer): T {
    return this.resolveByOptions(s, {
      lazy: this.isLazy,
      args: this.getArgs(s),
    });
  }
}

export class InstancesResolver implements IInjectFnResolver<Instance[]> {
  private isCascade = true;

  constructor(private predicate: InstancePredicate) {}

  cascade(isTrue: boolean): this {
    this.isCascade = isTrue;
    return this;
  }

  resolve(c: IContainer): Instance[] {
    const result = new Set<Instance>(c.getInstances().filter(this.predicate));
    if (this.isCascade) {
      for (const s of c.getScopes()) {
        for (const instance of s.getInstances().filter(this.predicate)) {
          result.add(instance);
        }
      }
    }
    return [...result];
  }
}

export const by = {
  many: <T>(target: DependencyKey | DepKey<T>) => {
    const alias = Is.dependencyKey(target) ? target : target.key;
    return new InjectionResolver<T[]>((s, options) => s.resolveMany(alias, options));
  },

  one: <T>(target: DependencyKey | constructor<T> | DepKey<T>) => {
    const key = Is.DepKey<T>(target) ? target.key : target;
    return new InjectionResolver<T>((s, options) => s.resolveOne(key, options));
  },

  /**
   * Use it only for optimization. Otherwise, recommended to use `by.one`
   */
  aliasOne: <T>(target: DependencyKey | DepKey<T>) => {
    const alias = Is.DepKey<T>(target) ? target.key : target;
    return new InjectionResolver<T>((s, options) => s.resolveOneByAlias(alias, options));
  },

  instances: (predicate: InstancePredicate = () => true) => new InstancesResolver(predicate),

  scope: {
    current: (container: IContainer) => container,

    create: (options: CreateScopeOptions) => (l: IContainer) => l.createScope(options),
  },
};
