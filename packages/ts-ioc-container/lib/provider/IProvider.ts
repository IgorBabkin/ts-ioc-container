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

export const visible =
  (isVisibleWhen: ChildrenVisibilityPredicate): MapFn<IProvider> =>
  (p) =>
    p.setVisibility(isVisibleWhen);
