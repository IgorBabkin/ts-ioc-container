import { IContainer, Tagged } from '../container/IContainer';
import { isProviderPipe, ProviderPipe, registerPipe } from './ProviderPipe';
import { InjectOptions } from '../injector/IInjector';
import { InjectionToken } from '../token/InjectionToken';

import { MapFn } from '../utils/fp';
import { Is } from '../utils/basic';

export type WithLazy = { lazy: boolean };
export type ProviderOptions = InjectOptions & Partial<WithLazy>;
export type ResolveDependency<T = unknown> = (container: IContainer, options: ProviderOptions) => T;
export type ScopeAccessOptions = { invocationScope: Tagged; providerScope: Tagged };
export type ScopeAccessRule = (options: ScopeAccessOptions) => boolean;

export type ArgsFn = (l: IContainer, ...args: unknown[]) => unknown[];
export interface IMapper {
  mapItem<T>(target: IProvider<T>): IProvider<T>;
}

export interface IProvider<T = any> {
  resolve(container: IContainer, options: ProviderOptions): T;

  hasAccess(options: ScopeAccessOptions): boolean;

  pipe(...mappers: (MapFn<IProvider<T>> | ProviderPipe<T>)[]): IProvider<T>;

  setAccessRule(hasAccessWhen: ScopeAccessRule): this;

  setArgs(argsFn: ArgsFn): this;

  lazy(): this;
}

export const args = <T>(...extraArgs: unknown[]) => registerPipe<T>((p) => p.setArgs(() => extraArgs));

export const argsFn = <T>(fn: ArgsFn) => registerPipe<T>((p) => p.setArgs(fn));

export const resolveByArgs = (s: IContainer, ...deps: unknown[]) =>
  deps.map((d) => {
    if (d instanceof InjectionToken) {
      return d.resolve(s);
    }
    if (Is.constructor(d)) {
      return s.resolve(d);
    }
    return d;
  });

export const scopeAccess = <T>(rule: ScopeAccessRule) => registerPipe<T>((p) => p.setAccessRule(rule));

export const lazy = <T>() => registerPipe<T>((p) => p.lazy());

export abstract class ProviderDecorator<T> implements IProvider<T> {
  protected constructor(private decorated: IProvider<T>) {}

  setAccessRule(rule: ScopeAccessRule): this {
    this.decorated.setAccessRule(rule);
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

  setArgs(argsFn: ArgsFn): this {
    this.decorated.setArgs(argsFn);
    return this;
  }

  lazy(): this {
    this.decorated.lazy();
    return this;
  }
}
