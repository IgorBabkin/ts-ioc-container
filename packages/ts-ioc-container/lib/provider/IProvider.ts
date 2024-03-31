import { IContainer, Resolvable, Tagged } from '../container/IContainer';
import { MapFn } from '../utils';

export type ResolveDependency<T = unknown> = (container: Resolvable, ...args: unknown[]) => T;
export type ChildrenPredicate = (c: Tagged) => boolean;

export interface IProvider<T = unknown> {
  clone(): IProvider<T>;

  resolve(container: Resolvable, ...args: unknown[]): T;

  isValidToClone(container: Tagged): boolean;

  isValidToResolve(container: IContainer, child?: Tagged): boolean;

  pipe(...mappers: MapFn<IProvider<T>>[]): IProvider<T>;

  hideFromChildren(isHiddenForChildren: ChildrenPredicate): this;
}
