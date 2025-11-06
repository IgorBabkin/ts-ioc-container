import { type IProvider, ProviderOptions } from '../provider/IProvider';
import { type constructor } from '../utils';
import { type IRegistration } from '../registration/IRegistration';

export type Tag = string;

export type DependencyKey = string | symbol;

type WithChild = { child: Tagged };
export type ResolveOneOptions = ProviderOptions & Partial<WithChild>;
type WithExcludedKeys = { excludedKeys: DependencyKey[] };
type TakeFirst = { takeFirst: number };
export type ResolveManyOptions = ResolveOneOptions & Partial<WithExcludedKeys> & Partial<TakeFirst>;

export interface Resolvable {
  resolve<T>(key: constructor<T> | DependencyKey, options?: ResolveOneOptions): T;
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

  resolve<T>(alias: constructor<T> | DependencyKey, options?: ResolveOneOptions): T;

  resolveByAlias<T>(alias: DependencyKey, options?: ResolveManyOptions): T[];

  resolveOneByAlias<T>(alias: DependencyKey, options?: ResolveOneOptions): T;

  createScope(options?: CreateScopeOptions): IContainer;

  getScopes(): IContainer[];

  removeScope(child: IContainer): void;

  useModule(module: IContainerModule): this;

  getParent(): IContainer | undefined;

  getInstances(): Instance[];

  dispose(): void;

  onInstanceCreated(instance: Instance): void;
}
