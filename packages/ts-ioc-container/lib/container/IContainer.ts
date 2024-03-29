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
}

export interface IContainerModule {
  applyTo(container: IContainer): void;
}

export interface IContainer extends Resolvable {
  createScope(...tags: Tag[]): IContainer;

  register(key: DependencyKey, value: IProvider): this;

  removeScope(child: IContainer): void;

  getInstances(): unknown[];

  dispose(): void;

  use(...modules: IContainerModule[]): this;

  getAllProviders(): Map<DependencyKey, IProvider>;

  getTokensByProvider(predicate: (provider: IProvider) => boolean): DependencyKey[];

  hasDependency(key: DependencyKey): boolean;

  hasTag(tag: Tag): boolean;
}
