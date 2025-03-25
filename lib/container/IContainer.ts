import { IProvider } from '../provider/IProvider';
import { constructor } from '../utils';
import { IRegistration } from '../registration/IRegistration';

export type Tag = string;

export type DependencyKey = string | symbol;

export function isDependencyKey(token: unknown): token is DependencyKey {
  return ['string', 'symbol'].includes(typeof token);
}

export const isConstructor = <T>(T: constructor<T> | unknown): T is constructor<T> => {
  return typeof T === 'function' && !!T.prototype && !!T.prototype.constructor;
};

export type InjectionToken<T = unknown> = constructor<T> | DependencyKey;

export type ResolveOneOptions = { args?: unknown[]; child?: Tagged; lazy?: boolean };
export type ResolveManyOptions = ResolveOneOptions & { excludedKeys?: DependencyKey[] };

export interface Resolvable {
  resolve<T>(key: InjectionToken<T>, options?: ResolveOneOptions): T;
}

export interface IContainerModule {
  applyTo(container: IContainer): void;
}

export interface Tagged {
  hasTag(tag: Tag): boolean;
}

export type AliasPredicate = (aliases: Set<DependencyKey>) => boolean;

export type CreateScopeOptions = { tags?: Tag[] };

export type Branded<T, Brand> = T & { _brand: Brand };
export type Instance = Branded<object, 'Instance'>;
export type RegisterOptions = { aliases?: DependencyKey[] };

export interface IContainer extends Tagged {
  readonly isDisposed: boolean;

  resolve<T>(alias: constructor<T> | DependencyKey, options?: ResolveManyOptions): T;

  resolveMany<T>(alias: DependencyKey, options?: ResolveManyOptions): T[];

  resolveByClass<T>(target: constructor<T>, options?: { args?: unknown[] }): T;

  resolveOneByKey<T>(key: DependencyKey, options?: ResolveOneOptions): T;

  resolveOneByAlias<T>(key: DependencyKey, options?: ResolveOneOptions): T;

  createScope(options?: CreateScopeOptions): IContainer;

  register(key: DependencyKey, value: IProvider, options?: RegisterOptions): this;

  addRegistration(registration: IRegistration): this;

  removeScope(child: IContainer): void;

  dispose(options?: { cascade?: boolean }): void;

  useModule(module: IContainerModule): this;

  getRegistrations(): IRegistration[];

  hasProvider(key: DependencyKey): boolean;

  getParent(): IContainer | undefined;

  getScopes(): IContainer[];

  getInstances(options?: { cascade?: boolean }): Instance[];

  detachFromParent(): void;
}

export type ContainerResolver = <T>(
  scope: IContainer,
  keyOrAlias: constructor<T> | DependencyKey,
  options?: ResolveOneOptions,
) => T;
