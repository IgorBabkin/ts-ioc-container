import { Resolvable, Tagged } from '../container/IContainer';
import { MapFn } from '../utils';

export type ResolveDependency<T = unknown> = (container: Resolvable, ...args: unknown[]) => T;

export type Alias = string;

export interface Aliased {
  hasAlias(alias: Alias): boolean;
}

export interface IProvider<T = unknown> extends Aliased {
  clone(): IProvider<T>;

  resolve(container: Resolvable, ...args: unknown[]): T;

  isValid(container: Tagged): boolean;

  pipe(...mappers: MapFn<IProvider<T>>[]): IProvider<T>;

  addAliases(...aliases: Alias[]): this;
}

export type ProviderPredicate = (provider: IProvider) => boolean;

export function alias<T = unknown>(...tokens: Alias[]): MapFn<IProvider<T>> {
  return (provider) => provider.addAliases(...tokens);
}
