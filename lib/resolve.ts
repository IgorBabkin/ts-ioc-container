import { CreateScopeOptions, DependencyKey, IContainer, Instance, isDependencyKey } from './container/IContainer';
import { constructor } from './utils';
import { DepKey, isDepKey } from './DepKey';
import { IInjectFnResolver } from './injector/IInjector';

export type InstancePredicate = (dep: unknown) => boolean;
export const all: InstancePredicate = () => true;
export type InjectOptions = { lazy: boolean; args: unknown[] };
export type ArgsFn = (l: IContainer) => unknown[];

export abstract class InjectionResolver<T> {
  #isLazy: boolean = false;
  #argsFn: ArgsFn = () => [];

  args(...deps: unknown[]): this {
    this.#argsFn = () => deps;
    return this;
  }

  argsFn(fn: ArgsFn): this {
    this.#argsFn = fn;
    return this;
  }

  lazy(): this {
    this.#isLazy = true;
    return this;
  }

  resolve(s: IContainer): T {
    return this.resolveByOptions(s, {
      lazy: this.#isLazy,
      args: this.#argsFn(s),
    });
  }

  protected abstract resolveByOptions(s: IContainer, options: InjectOptions): T;
}

export class AliasManyResolver<T> extends InjectionResolver<T[]> {
  constructor(private alias: DependencyKey) {
    super();
  }

  protected override resolveByOptions(c: IContainer, options: InjectOptions): T[] {
    return c.resolveMany(this.alias, options);
  }
}

export class AliasOneResolver<T> extends InjectionResolver<T[]> {
  constructor(private alias: DependencyKey) {
    super();
  }

  protected override resolveByOptions(c: IContainer, options: InjectOptions): T[] {
    return c.resolveOneByAlias(this.alias, options);
  }
}

export class ClassResolver<T> extends InjectionResolver<T> {
  constructor(private Target: constructor<T>) {
    super();
  }

  protected override resolveByOptions(c: IContainer, options: InjectOptions): T {
    return c.resolveByClass(this.Target, options);
  }
}

export class InstancesResolver implements IInjectFnResolver<Instance[]> {
  #cascade = true;

  constructor(private predicate: InstancePredicate) {}

  cascade(isTrue: boolean): this {
    this.#cascade = isTrue;
    return this;
  }

  resolve(c: IContainer): Instance[] {
    return c.getInstances({ cascade: this.#cascade }).filter(this.predicate);
  }
}

export class KeyResolver<T> extends InjectionResolver<T> {
  constructor(private key: DependencyKey) {
    super();
  }

  protected override resolveByOptions(c: IContainer, options: InjectOptions): T {
    return c.resolveOneByKey(this.key, options);
  }
}

export class OneResolver<T> extends InjectionResolver<T> {
  constructor(private key: constructor<T> | DependencyKey) {
    super();
  }

  protected override resolveByOptions(c: IContainer, options: InjectOptions): T {
    return c.resolve(this.key, options);
  }
}

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
