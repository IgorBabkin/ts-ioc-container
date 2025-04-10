import { type IProvider } from '../provider/IProvider';
import { type constructor, isConstructor } from '../utils';
import { type IRegistration } from '../registration/IRegistration';
import { DependencyNotFoundError } from '../errors/DependencyNotFoundError';

export type Tag = string;

export type DependencyKey = string | symbol;

export function isDependencyKey(token: unknown): token is DependencyKey {
  return ['string', 'symbol'].includes(typeof token);
}

export type InjectionToken<T = unknown> = constructor<T> | DependencyKey;

export type ResolveOneOptions = { args?: unknown[]; child?: Tagged; lazy?: boolean };
export type ResolveManyOptions = ResolveOneOptions & { excludedKeys?: Set<DependencyKey> };

export interface Resolvable {
  resolve<T>(key: InjectionToken<T>, options?: ResolveOneOptions): T;
}

export interface IContainerModule {
  applyTo(container: IContainer): void;
}

export interface Tagged {
  hasTag(tag: Tag): boolean;
}

export type CreateScopeOptions = { tags?: Tag[] };

export interface Instance<T = unknown> {
  new (...args: unknown[]): T;
}

export type RegisterOptions = { aliases?: DependencyKey[] };

export interface IContainer extends Tagged {
  readonly isDisposed: boolean;

  register(key: DependencyKey, value: IProvider, options?: RegisterOptions): this;

  addRegistration(registration: IRegistration): this;

  getRegistrations(): IRegistration[];

  resolveByClass<T>(target: constructor<T>, options?: { args?: unknown[] }): T;

  resolveOne<T>(alias: constructor<T> | DependencyKey, options?: ResolveManyOptions): T;

  resolveOneByKey<T>(key: DependencyKey, options?: ResolveOneOptions): T;

  resolveOneByAlias<T>(key: DependencyKey, options?: ResolveOneOptions): T;

  resolveMany<T>(alias: DependencyKey, options?: ResolveManyOptions): T[];

  createScope(options?: CreateScopeOptions): IContainer;

  getScopes(): IContainer[];

  removeScope(child: IContainer): void;

  useModule(module: IContainerModule): this;

  getParent(): IContainer | undefined;

  getInstances(): Instance[];

  dispose(): void;
}

export const DEFAULT_CONTAINER_RESOLVER = <T>(
  scope: IContainer,
  keyOrAlias: constructor<T> | DependencyKey,
  options?: ResolveOneOptions,
): T => {
  if (isConstructor(keyOrAlias)) {
    return scope.resolveByClass(keyOrAlias, options);
  }

  try {
    return scope.resolveOneByKey(keyOrAlias, options);
  } catch (e) {
    if (e instanceof DependencyNotFoundError) {
      return scope.resolveOneByAlias(keyOrAlias, options);
    }

    throw e;
  }
};
