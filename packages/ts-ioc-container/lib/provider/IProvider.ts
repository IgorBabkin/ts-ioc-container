import { IContainer, Tagged } from '../container/IContainer';
import { MapFn } from '../utils';
import { setMetadata } from '../metadata';

export type ResolveDependency<T = unknown> = (container: IContainer, ...args: unknown[]) => T;
export type ChildrenVisibilityPredicate = (options: { child: Tagged; isParent: boolean }) => boolean;
export type ScopePredicate = (c: Tagged) => boolean;

export interface IProvider<T = unknown> {
  clone(): IProvider<T>;

  resolve(container: IContainer, ...args: unknown[]): T;

  isValidToClone(container: Tagged): boolean;

  isVisible(parent: Tagged, child: Tagged): boolean;

  pipe(...mappers: MapFn<IProvider<T>>[]): IProvider<T>;

  setVisibility(isVisibleWhen: ChildrenVisibilityPredicate): this;

  setScopePredicate(isValidWhen: ScopePredicate): this;
}

export const PROVIDER_KEY = 'provider';
export const provider = (...mappers: MapFn<IProvider>[]): ClassDecorator => setMetadata(PROVIDER_KEY, mappers);
export const visible =
  (isVisibleWhen: ChildrenVisibilityPredicate): MapFn<IProvider> =>
  (p) =>
    p.setVisibility(isVisibleWhen);

export function scope<T = unknown>(predicate: ScopePredicate): MapFn<IProvider<T>> {
  return (provider) => provider.setScopePredicate(predicate);
}
