import { IProvider } from '../provider/IProvider';
import { constructor, MapFn } from '../utils';
import { IRegistration } from '../registration/IRegistration';

export type Tag = string;

export type DependencyKey = string | symbol;

export function isDependencyKey(token: constructor<any> | DependencyKey | MapFn<any>): token is DependencyKey {
  return ['string', 'symbol'].includes(typeof token);
}

export const isConstructor = <T>(T: constructor<T> | unknown): T is constructor<T> => {
  return typeof T === 'function' && !!T.prototype && !!T.prototype.constructor;
};

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

export type CreateScopeOptions = { tags?: Tag[]; idempotent?: boolean };

export interface IContainer extends Resolvable, Tagged {
  readonly tags: Set<Tag>;

  readonly isDisposed: boolean;

  createScope(options?: CreateScopeOptions): IContainer;

  register(key: DependencyKey, value: IProvider): this;

  add(registration: IRegistration): this;

  removeScope(child: IContainer): void;

  getInstances(direction?: 'parent' | 'child'): object[];

  getOwnInstances(): object[];

  dispose(): void;

  use(module: IContainerModule): this;

  getRegistrations(): IRegistration[];

  hasDependency(key: DependencyKey): boolean;

  reduceToRoot<TResult>(fn: ReduceScope<TResult>, initial: TResult): TResult;

  findChild(matchFn: (s: IContainer) => boolean): IContainer | undefined;

  findParent(matchFn: (s: IContainer) => boolean): IContainer | undefined;

  matchTags(tags: Tag[]): boolean;

  resolveManyByAlias(
    predicate: AliasPredicate,
    options?: ResolveOptions,
    result?: Map<DependencyKey, unknown>,
  ): Map<DependencyKey, unknown>;

  resolveOneByAlias<T>(predicate: AliasPredicate, options?: ResolveOptions): [DependencyKey, T];

  hasInstance(value: object, direction: 'parent' | 'child'): boolean;
}
