import { DependencyKey, IContainer, Resolvable } from '../container/IContainer';
import { MapFn } from '../utils';

export type ResolveDependency<T = unknown> = (container: Resolvable, ...args: unknown[]) => T;

export interface IProvider<T = unknown> {
  clone(): IProvider<T>;

  resolve(container: Resolvable, ...args: unknown[]): T;

  isValid(container: IContainer): boolean;

  pipe(...mappers: MapFn<IProvider<T>>[]): IProvider<T>;

  hasAlias(alias: DependencyKey): boolean;

  addAliases(...aliases: DependencyKey[]): this;
}

export function alias<T = unknown>(...tokens: DependencyKey[]): MapFn<IProvider<T>> {
  return (provider) => provider.addAliases(...tokens);
}
