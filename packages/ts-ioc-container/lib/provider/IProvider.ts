import { Resolvable, Tagged } from '../container/IContainer';
import { MapFn } from '../utils';

export type ResolveDependency<T = unknown> = (container: Resolvable, ...args: unknown[]) => T;

export interface IProvider<T = unknown> {
  clone(): IProvider<T>;

  resolve(container: Resolvable, ...args: unknown[]): T;

  isValid(filters: Tagged): boolean;

  pipe(...mappers: MapFn<IProvider<T>>[]): IProvider<T>;
}
