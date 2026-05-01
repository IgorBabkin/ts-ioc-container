import { IContainer, Tagged } from '../container/IContainer';
import { isProviderPipe, ProviderPipe, registerPipe } from './ProviderPipe';
import { InjectOptions } from '../injector/IInjector';

import { MapFn } from '../utils/fp';

export type WithLazy = { lazy: boolean };
export type ProviderOptions = InjectOptions & Partial<WithLazy>;
export type ResolveDependency<T = unknown> = (container: IContainer, options: ProviderOptions) => T;
export type ScopeAccessOptions = { invocationScope: Tagged; providerScope: Tagged };
export type ScopeAccessRule = (prev: boolean, options: ScopeAccessOptions) => boolean;

export type ArgsFn = (l: IContainer, options?: InjectOptions) => unknown[];
export interface IMapper {
  mapItem<T>(target: IProvider<T>): IProvider<T>;
}

export interface IProvider<T = any> {
  resolve(container: IContainer, options: ProviderOptions): T;

  hasAccess(options: ScopeAccessOptions): boolean;

  pipe(...mappers: (MapFn<IProvider<T>> | ProviderPipe<T>)[]): IProvider<T>;

  addAccessRule(rule: ScopeAccessRule): this;

  addArgs(...extraArgs: unknown[]): this;

  addArgsFn(argsFn: ArgsFn): this;

  lazy(): this;
}

export const appendArgs = <T>(...extraArgs: unknown[]) => registerPipe<T>((p) => p.addArgs(...extraArgs));

export const appendArgsFn = <T>(fn: ArgsFn) => registerPipe<T>((p) => p.addArgsFn(fn));

export const scopeAccess = <T>(rule: ScopeAccessRule) => registerPipe<T>((p) => p.addAccessRule(rule));

export const lazy = <T>() => registerPipe<T>((p) => p.lazy());

export abstract class ProviderDecorator<T> implements IProvider<T> {
  protected constructor(private decorated: IProvider<T>) {}

  addAccessRule(rule: ScopeAccessRule): this {
    this.decorated.addAccessRule(rule);
    return this;
  }

  hasAccess(options: ScopeAccessOptions): boolean {
    return this.decorated.hasAccess(options);
  }

  resolve(container: IContainer, options: ProviderOptions): T {
    return this.decorated.resolve(container, options);
  }

  pipe(...mappers: (MapFn<IProvider<T>> | ProviderPipe<T>)[]): IProvider<T> {
    const fns = mappers.map((m): MapFn<IProvider<T>> => {
      if (isProviderPipe<T>(m)) {
        return m.mapProvider.bind(m);
      }
      return m;
    });
    this.decorated = this.decorated.pipe(...fns);
    return this;
  }

  addArgs(...extraArgs: unknown[]): this {
    this.decorated.addArgs(...extraArgs);
    return this;
  }

  addArgsFn(argsFn: ArgsFn): this {
    this.decorated.addArgsFn(argsFn);
    return this;
  }

  lazy(): this {
    this.decorated.lazy();
    return this;
  }
}
