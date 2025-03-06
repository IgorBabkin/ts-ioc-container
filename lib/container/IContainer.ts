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
  hasTag(tag: Tag): boolean;
}

export type Alias = string;
export type AliasPredicate = (aliases: Set<Alias>) => boolean;

export type CreateScopeOptions = { tags?: Tag[] };

export type Branded<T, Brand> = T & { _brand: Brand };
export type Instance = Branded<object, 'Instance'>;

export interface IContainer extends Resolvable, Tagged {
  readonly isDisposed: boolean;

  createScope(options?: CreateScopeOptions): IContainer;

  register(key: DependencyKey, value: IProvider): this;

  add(registration: IRegistration): this;

  removeScope(child: IContainer): void;

  /**
   * @param options - cascade must be true by default
   */
  dispose(options?: { cascade?: boolean }): void;

  use(module: IContainerModule): this;

  getRegistrations(): IRegistration[];

  hasProvider(key: DependencyKey): boolean;

  getParent(): IContainer | undefined;

  getScopes(): IContainer[];

  getInstances(): Instance[];

  /**
   * Detaches container from parent
   */
  detach(): void;

  resolveManyByAlias(
    predicate: AliasPredicate,
    options?: ResolveOptions,
    result?: Map<DependencyKey, unknown>,
  ): Map<DependencyKey, unknown>;

  resolveOneByAlias<T>(predicate: AliasPredicate, options?: ResolveOptions): [DependencyKey, T];
}
