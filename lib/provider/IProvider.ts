import { IContainer, Tagged } from '../container/IContainer';
import { constructor, MapFn, pipe } from '../utils';
import { getMetadata } from '../metadata';
import { IRegistration } from '../registration/IRegistration';

export type ProviderResolveOptions = { args: unknown[]; lazy?: boolean };
export type ResolveDependency<T = unknown> = (container: IContainer, options: ProviderResolveOptions) => T;
export type ChildrenVisibilityPredicate = (options: { child: Tagged; isParent: boolean }) => boolean;

export type ArgsFn = (l: IContainer, ...args: unknown[]) => unknown[];

export function args<T = unknown>(...extraArgs: unknown[]): MapFn<IProvider<T>> {
  return (provider) => provider.setArgs(() => extraArgs);
}

export function argsFn<T = unknown>(fn: ArgsFn): MapFn<IProvider<T>> {
  return (provider) => provider.setArgs(fn);
}

export interface IProvider<T = any> {
  resolve(container: IContainer, options: ProviderResolveOptions): T;

  isVisible(parent: Tagged, child: Tagged): boolean;

  pipe(...mappers: MapFn<IProvider<T>>[]): IProvider<T>;

  setVisibility(isVisibleWhen: ChildrenVisibilityPredicate): this;

  setArgs(argsFn: ArgsFn): this;
}

const METADATA_KEY = 'provider';
export const provider =
  (...mappers: MapFn<IProvider>[]): MapFn<IRegistration> =>
  (r) =>
    r.pipe(...mappers);

export const getTransformers = <T>(Target: constructor<T>) =>
  getMetadata<MapFn<IProvider<T>>[]>(Target, METADATA_KEY) ?? [];

export const visible =
  (isVisibleWhen: ChildrenVisibilityPredicate): MapFn<IProvider> =>
  (p) =>
    p.setVisibility(isVisibleWhen);

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
