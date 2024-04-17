import { IProvider } from '../provider/IProvider';
import { constructor } from '../utils';
import { IRegistration } from '../registration/IRegistration';

export type Tag = string;

export type DependencyKey = string | symbol;

export function isDependencyKey<T>(token: InjectionToken<T>): token is DependencyKey {
  return ['string', 'symbol'].includes(typeof token);
}

export function isConstructor<T>(token: InjectionToken<T>): token is constructor<T> {
  return typeof token === 'function';
}

export type InjectionToken<T = unknown> = constructor<T> | DependencyKey;

export type ResolveOptions = { args?: unknown[]; child?: Tagged };

export interface Resolvable {
  resolve<T>(key: InjectionToken<T>, options?: ResolveOptions): T;
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
  readonly isDisposed: boolean;

  createScope(...tags: Tag[]): IContainer;

  register(key: DependencyKey, value: IProvider, aliases?: Alias[]): this;

  addRegistration(registration: IRegistration): this;

  removeScope(child: IContainer): void;

  getInstances(): unknown[];

  dispose(): void;

  use(module: IContainerModule): this;

  getRegistrations(): IRegistration[];

  hasDependency(key: DependencyKey): boolean;

  getKeysByAlias(alias: AliasPredicate): DependencyKey[];

  getKeyByAlias(alias: AliasPredicate): DependencyKey;
}
