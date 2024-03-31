import { IProvider } from '../provider/IProvider';
import { constructor } from '../utils';

export type Tag = string;

export type DependencyKey = string | symbol;

export function isDependencyKey<T>(token: InjectionToken<T>): token is DependencyKey {
  return ['string', 'symbol'].includes(typeof token);
}

export function isConstructor<T>(token: InjectionToken<T>): token is constructor<T> {
  return typeof token === 'function';
}

export type InjectionToken<T = unknown> = constructor<T> | DependencyKey;

export interface Resolvable {
  resolve<T>(key: InjectionToken<T>, ...args: unknown[]): T;

  resolveFromChild<T>(child: Tagged, key: InjectionToken<T>, ...args: unknown[]): T;
}

export interface IContainerModule {
  applyTo(container: IContainer): void;
}

export interface Tagged {
  hasTag(tag: Tag): boolean;
}

export type Alias = string;
export type AliasPredicate = (aliases: Alias[]) => boolean;

export interface IContainer extends Resolvable, Tagged {
  createScope(...tags: Tag[]): IContainer;

  register(key: DependencyKey, value: IProvider, aliases?: Alias[]): this;

  removeScope(child: IContainer): void;

  getInstances(): unknown[];

  dispose(): void;

  use(...modules: IContainerModule[]): this;

  getAllProviders(): Map<DependencyKey, IProvider>;

  hasDependency(key: DependencyKey): boolean;

  getKeysByAlias(alias: AliasPredicate): DependencyKey[];
}
