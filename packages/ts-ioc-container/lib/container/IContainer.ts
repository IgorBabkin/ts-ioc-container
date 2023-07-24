import { IProvider } from '../provider/IProvider';
import { constructor } from '../utils';

export type Tag = string;

export interface Tagged {
  hasTag(tag: Tag): boolean;
}

export type DependencyKey = string | symbol;

export function isDependencyKey<T>(token: InjectionToken<T>): token is DependencyKey {
  return ['string', 'symbol'].includes(typeof token);
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

  getProviders(): Map<DependencyKey, IProvider>;

  removeScope(child: IContainer): void;

  getInstances(): unknown[];

  dispose(): void;

  add(module: IContainerModule): this;
}
