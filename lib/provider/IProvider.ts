/* eslint-disable no-prototype-builtins */
import { IContainer, Tagged } from '../container/IContainer';
import { MapFn, pipe } from '../utils';

export type ProviderResolveOptions = { args: unknown[]; lazy?: boolean };
export type ResolveDependency<T = unknown> = (container: IContainer, options: ProviderResolveOptions) => T;
export type ChildrenVisibilityPredicate = (options: { child: Tagged; isParent: boolean }) => boolean;

export type ArgsFn = (l: IContainer, ...args: unknown[]) => unknown[];
export interface IMapper<T> {
  mapItem<T>(target: IProvider<T>): IProvider<T>;
}

export const isMapper = <T>(target: unknown): target is IMapper<T> =>
  typeof target === 'object' && (target as object).hasOwnProperty('mapItem');

export class ProviderMapper implements IMapper<IProvider> {
  constructor(private readonly mappers: MapFn<IProvider>[]) {}

  mapItem<T>(target: IProvider<T>): IProvider<T> {
    return target.pipe(...this.mappers);
  }
}

export function args(...extraArgs: unknown[]) {
  return new ProviderMapper([(provider) => provider.setArgs(() => extraArgs)]);
}

export function argsFn(fn: ArgsFn) {
  return new ProviderMapper([(provider) => provider.setArgs(fn)]);
}

export interface IProvider<T = any> {
  resolve(container: IContainer, options: ProviderResolveOptions): T;

  isVisible(parent: Tagged, child: Tagged): boolean;

  pipe(...mappers: (MapFn<IProvider<T>> | ProviderMapper)[]): IProvider<T>;

  setVisibility(isVisibleWhen: ChildrenVisibilityPredicate): this;

  setArgs(argsFn: ArgsFn): this;
}

export const visible = (isVisibleWhen: ChildrenVisibilityPredicate) =>
  new ProviderMapper([(p) => p.setVisibility(isVisibleWhen)]);

export abstract class ProviderDecorator<T> implements IProvider<T> {
  protected constructor(private decorated: IProvider<T>) {}

  setVisibility(predicate: ChildrenVisibilityPredicate): this {
    this.decorated.setVisibility(predicate);
    return this;
  }

  isVisible(parent: IContainer, child: Tagged): boolean {
    return this.decorated.isVisible(parent, child);
  }

  resolve(container: IContainer, options: ProviderResolveOptions): T {
    return this.decorated.resolve(container, options);
  }

  pipe(...mappers: MapFn<IProvider<T>>[]): IProvider<T> {
    return pipe(...mappers)(this);
  }

  setArgs(argsFn: ArgsFn): this {
    this.decorated.setArgs(argsFn);
    return this;
  }
}
