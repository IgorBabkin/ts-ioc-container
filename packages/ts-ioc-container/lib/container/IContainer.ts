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

export type ResolveOptions = { args?: unknown[]; child?: Tagged; lazy?: boolean };

export interface Resolvable {
  resolve<T>(key: InjectionToken<T>, options?: ResolveOptions): T;
}

export interface IContainerModule {
  applyTo(container: IContainer): void;
}

export interface Tagged {
  readonly id: string;
  readonly level: number;
  hasTag(tag: Tag): boolean;
}

export type Alias = string;
export type AliasPredicate = (aliases: Set<Alias>) => boolean;

export type ReduceScope<TResult> = (acc: TResult, container: IContainer) => TResult;

export interface IContainer extends Resolvable, Tagged {
  tags: Set<Tag>;

  createScope(...tags: Tag[]): IContainer;

  register(key: DependencyKey, value: IProvider): this;

  add(registration: IRegistration): this;

  removeScope(child: IContainer): void;

  getInstances(direction?: 'parent' | 'child'): object[];

  dispose(): void;

  use(module: IContainerModule): this;

  getRegistrations(): IRegistration[];

  hasDependency(key: DependencyKey): boolean;

  reduceToRoot<TResult>(fn: ReduceScope<TResult>, initial: TResult): TResult;

  findChild(matchFn: (s: IContainer) => boolean): IContainer | undefined;

  findParent(matchFn: (s: IContainer) => boolean): IContainer | undefined;

  resolveManyByAlias(
    predicate: AliasPredicate,
    options?: ResolveOptions,
    result?: Map<DependencyKey, unknown>,
  ): Map<DependencyKey, unknown>;

  resolveOneByAlias<T>(predicate: AliasPredicate, options?: ResolveOptions): [DependencyKey, T];

  hasInstance(value: object, direction: 'parent' | 'child'): boolean;
}
