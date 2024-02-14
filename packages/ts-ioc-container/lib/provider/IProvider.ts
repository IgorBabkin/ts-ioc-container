import { DependencyKey, IContainer, Resolvable, Tagged } from '../container/IContainer';
import { MapFn } from '../utils';

export type ResolveDependency<T = unknown> = (container: Resolvable, ...args: unknown[]) => T;

export interface IProvider<T = unknown> {
  clone(): IProvider<T>;

  resolve(container: Resolvable, ...args: unknown[]): T;

  isValid(filters: Tagged): boolean;

  pipe(...mappers: MapFn<IProvider<T>>[]): IProvider<T>;

  hasAlias(alias: DependencyKey): boolean;

  addAliases(...aliases: DependencyKey[]): this;
}

export function alias<T = unknown>(...tokens: DependencyKey[]): MapFn<IProvider<T>> {
  return (provider) => provider.addAliases(...tokens);
}

export const bySomeAlias =
  (...aliases: DependencyKey[]) =>
  (с: IContainer, ...args: unknown[]) =>
    с.getTokensByProvider((p) => aliases.some((alias) => p.hasAlias(alias))).map((t) => с.resolve(t, ...args));

export const byAllAliases =
  (...aliases: DependencyKey[]) =>
  (с: IContainer, ...args: unknown[]) =>
    с.getTokensByProvider((p) => aliases.some((alias) => p.hasAlias(alias))).map((t) => с.resolve(t, ...args));

export const byKeys =
  (keys: DependencyKey[]) =>
  (с: IContainer, ...args: unknown[]) =>
    keys.map((t) => с.resolve(t, ...args));
