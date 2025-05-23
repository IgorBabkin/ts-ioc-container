import { type IProvider, ProviderOptions } from '../provider/IProvider';
import { type constructor, Is } from '../utils';
import { type IRegistration } from '../registration/IRegistration';
import { DependencyNotFoundError } from '../errors/DependencyNotFoundError';

export type Tag = string;

export type DependencyKey = string | symbol;

export type InjectionToken<T = unknown> = constructor<T> | DependencyKey;

type WithChild = { child: Tagged };
export type ResolveOneOptions = ProviderOptions & Partial<WithChild>;
type WithExcludedKeys = { excludedKeys: Set<DependencyKey> };
export type ResolveManyOptions = ResolveOneOptions & Partial<WithExcludedKeys>;

export interface Resolvable {
  resolve<T>(key: InjectionToken<T>, options?: ResolveOneOptions): T;
}

export interface IContainerModule {
  applyTo(container: IContainer): void;
}

export interface Tagged {
  hasTag(tag: Tag): boolean;
}

type WithTags = { tags: Tag[] };
export type CreateScopeOptions = Partial<WithTags>;

export interface Instance<T = unknown> {
  new (...args: unknown[]): T;
}

export type RegisterOptions = { aliases?: DependencyKey[] };

export interface IContainer extends Tagged {
  readonly isDisposed: boolean;

  register(key: DependencyKey, value: IProvider, options?: RegisterOptions): this;

  addRegistration(registration: IRegistration): this;

  getRegistrations(): IRegistration[];

  resolveClass<T>(target: constructor<T>, options?: ProviderOptions): T;

  resolveOne<T>(alias: constructor<T> | DependencyKey, options?: ResolveOneOptions): T;

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
  if (Is.constructor(keyOrAlias)) {
    return scope.resolveClass(keyOrAlias, options);
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
