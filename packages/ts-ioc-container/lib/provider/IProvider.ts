import { IContainer, Tagged } from '../container/IContainer';
import { constructor, MapFn } from '../utils';
import { getMetadata, setMetadata } from '../metadata';

export type ResolveDependency<T = unknown> = (container: IContainer, ...args: unknown[]) => T;
export type ChildrenVisibilityPredicate = (options: { child: Tagged; isParent: boolean }) => boolean;

export interface IProvider<T = unknown> {
  resolve(container: IContainer, ...args: unknown[]): T;

  isVisible(parent: Tagged, child: Tagged): boolean;

  pipe(...mappers: MapFn<IProvider<T>>[]): IProvider<T>;

  setVisibility(isVisibleWhen: ChildrenVisibilityPredicate): this;
}

const METADATA_KEY = 'provider';
export const provider = (...mappers: MapFn<IProvider>[]): ClassDecorator => setMetadata(METADATA_KEY, mappers);
export const getTransformers = <T>(Target: constructor<T>) =>
  getMetadata<MapFn<IProvider<T>>[]>(Target, METADATA_KEY) ?? [];

export const visible =
  (isVisibleWhen: ChildrenVisibilityPredicate): MapFn<IProvider> =>
  (p) =>
    p.setVisibility(isVisibleWhen);
