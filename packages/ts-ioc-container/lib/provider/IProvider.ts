import { Alias, AliasPredicate, IContainer, Tagged } from '../container/IContainer';
import { constructor, lazyInstance, MapFn, pipe } from '../utils';
import { getMetadata, setMetadata } from '../metadata';

export type ProviderResolveOptions = { args: unknown[]; lazy?: boolean };
export type InstantDependencyOptions = Omit<ProviderResolveOptions, 'lazy'>;
export type ResolveDependency<T = unknown> = (container: IContainer, options: ProviderResolveOptions) => T;
export type ChildrenVisibilityPredicate = (options: { child: Tagged; isParent: boolean }) => boolean;

export type ArgsFn = (l: IContainer, ...args: unknown[]) => unknown[];

export function args<T = unknown>(...extraArgs: unknown[]): MapFn<IProvider<T>> {
  return (provider) => provider.setArgs(() => extraArgs);
}

export function argsFn<T = unknown>(fn: ArgsFn): MapFn<IProvider<T>> {
  return (provider) => provider.setArgs(fn);
}

export interface IProvider<T = unknown> {
  resolve(container: IContainer, options: ProviderResolveOptions): T;

  isVisible(parent: Tagged, child: Tagged): boolean;

  pipe(...mappers: MapFn<IProvider<T>>[]): IProvider<T>;

  setVisibility(isVisibleWhen: ChildrenVisibilityPredicate): this;

  setArgs(argsFn: ArgsFn): this;

  matchAliases(predicate: AliasPredicate): boolean;

  addAliases(...aliases: Alias[]): this;
}

const METADATA_KEY = 'provider';
export const provider = <Instance>(...mappers: MapFn<IProvider<Instance>>[]): ClassDecorator =>
  setMetadata(METADATA_KEY, mappers);
export const getTransformers = <T>(Target: constructor<T>) =>
  getMetadata<MapFn<IProvider<T>>[]>(Target, METADATA_KEY) ?? [];

export const alias =
  (...aliases: Alias[]): MapFn<IProvider> =>
  (r) =>
    r.addAliases(...aliases);

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

  resolve(container: IContainer, { args, lazy }: ProviderResolveOptions): T {
    return lazyInstance(() => this.resolveInstantly(container, { args }), lazy);
  }

  protected abstract resolveInstantly(container: IContainer, options: InstantDependencyOptions): T;

  pipe(...mappers: MapFn<IProvider<T>>[]): IProvider<T> {
    return pipe(...mappers)(this);
  }

  matchAliases(predicate: AliasPredicate): boolean {
    return this.decorated.matchAliases(predicate);
  }

  addAliases(...aliases: Alias[]): this {
    this.decorated.addAliases(...aliases);
    return this;
  }

  setArgs(argsFn: ArgsFn): this {
    this.decorated.setArgs(argsFn);
    return this;
  }
}
