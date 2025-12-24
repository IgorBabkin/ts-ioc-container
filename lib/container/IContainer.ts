import { type IProvider, ProviderOptions } from '../provider/IProvider';
import { type IRegistration } from '../registration/IRegistration';
import { OnConstructHook } from '../hooks/onConstruct';
import { OnDisposeHook } from '../hooks/onDispose';
import { type constructor, Instance } from '../utils/basic';

export type DependencyKey = string | symbol;
export function isDependencyKey(target: unknown): target is DependencyKey {
  return typeof target === 'symbol' || typeof target === 'string';
}

export type Tag = string;
type WithTags = { tags: Tag[] };
type WithChild = { child: Tagged };
type WithExcludedKeys = { excludedKeys: DependencyKey[] };
export interface Tagged {
  hasTag(tag: Tag): boolean;
  addTags(...tags: Tag[]): void;
}

export type ResolveOneOptions = ProviderOptions & Partial<WithChild>;
export type ResolveManyOptions = ResolveOneOptions & Partial<WithExcludedKeys>;
export interface Resolvable {
  resolve<T>(key: constructor<T> | DependencyKey, options?: ResolveOneOptions): T;
}

export interface IContainerModule {
  applyTo(container: IContainer): void;
}
export type CreateScopeOptions = Partial<WithTags>;
export type RegisterOptions = { aliases?: DependencyKey[] };

export interface IContainer extends Tagged {
  readonly isDisposed: boolean;

  addOnConstructHook(...hooks: OnConstructHook[]): this;

  addOnDisposeHook(...hooks: OnDisposeHook[]): this;

  register(key: DependencyKey, value: IProvider, options?: RegisterOptions): this;

  addRegistration(registration: IRegistration): this;

  getRegistrations(): IRegistration[];

  hasRegistration(key: DependencyKey): boolean;

  resolve<T>(target: constructor<T> | DependencyKey, options?: ResolveOneOptions): T;

  resolveByAlias<T>(alias: DependencyKey, options?: ResolveManyOptions): T[];

  resolveOneByAlias<T>(alias: DependencyKey, options?: ResolveOneOptions): T;

  createScope(options?: CreateScopeOptions): IContainer;

  getScopes(): IContainer[];

  removeScope(child: IContainer): void;

  useModule(module: IContainerModule): this;

  getParent(): IContainer | undefined;

  getInstances(cascade?: boolean): Instance[];

  dispose(): void;

  addInstance(instance: Instance): void;
}
