import type { IContainer, Tagged } from '../container/IContainer';
import type { MapFn } from '../utils';
import { isProviderPipe, ProviderPipe, registerPipe } from './ProviderPipe';

export type ProviderResolveOptions = { args: unknown[]; lazy?: boolean };
export type ResolveDependency<T = unknown> = (container: IContainer, options: ProviderResolveOptions) => T;
export type ScopeAccessOptions = { invocationScope: Tagged; providerScope: Tagged };
export type ScopeAccessFn = (options: ScopeAccessOptions) => boolean;

export type ArgsFn = (l: IContainer, ...args: unknown[]) => unknown[];
export interface IMapper<T> {
  mapItem<T>(target: IProvider<T>): IProvider<T>;
}

export interface IProvider<T = any> {
  resolve(container: IContainer, options: ProviderResolveOptions): T;

  hasAccess(options: ScopeAccessOptions): boolean;

  pipe(...mappers: (MapFn<IProvider<T>> | ProviderPipe<T>)[]): IProvider<T>;

  setAccessPredicate(hasAccessWhen: ScopeAccessFn): this;

  setArgs(argsFn: ArgsFn): this;

  lazy(): this;
}

export const args = <T>(...extraArgs: unknown[]) => registerPipe<T>((p) => p.setArgs(() => extraArgs));

export const argsFn = <T>(fn: ArgsFn) => registerPipe<T>((p) => p.setArgs(fn));

export const scopeAccess = <T>(predicate: ScopeAccessFn) => registerPipe<T>((p) => p.setAccessPredicate(predicate));

export const lazy = <T>() => registerPipe<T>((p) => p.lazy());

export abstract class ProviderDecorator<T> implements IProvider<T> {
  protected constructor(private decorated: IProvider<T>) {}

  setAccessPredicate(predicate: ScopeAccessFn): this {
    this.decorated.setAccessPredicate(predicate);
    return this;
  }

  hasAccess(options: ScopeAccessOptions): boolean {
    return this.decorated.hasAccess(options);
  }

  resolve(container: IContainer, options: ProviderResolveOptions): T {
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
