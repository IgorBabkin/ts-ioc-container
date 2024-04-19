import { IContainer, Tagged } from '../container/IContainer';
import { MapFn } from '../utils';

export type ResolveDependency<T = unknown> = (container: IContainer, ...args: unknown[]) => T;
export type ChildrenVisibilityPredicate = (options: { child: Tagged; isParent: boolean }) => boolean;

export interface IProvider<T = unknown> {
  resolve(container: IContainer, ...args: unknown[]): T;

  isVisible(parent: Tagged, child: Tagged): boolean;

  pipe(...mappers: MapFn<IProvider<T>>[]): IProvider<T>;

  setVisibility(isVisibleWhen: ChildrenVisibilityPredicate): this;
}

export const markAsProvider = <T>(fn: MapFn<IProvider<T>>) => {
  // @ts-ignore
  fn.__provider = true;
  return fn;
};

export const isProviderMapper = <T>(fn: unknown): fn is MapFn<IProvider<T>> => {
  // @ts-ignore
  return fn.__provider === true;
};

export const visible = (isVisibleWhen: ChildrenVisibilityPredicate): MapFn<IProvider> =>
  markAsProvider((p) => p.setVisibility(isVisibleWhen));
