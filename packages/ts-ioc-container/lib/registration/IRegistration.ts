import { type DependencyKey, type IContainer, type IContainerModule, isDependencyKey } from '../container/IContainer';
import type { ArgsFn, DecorateFn, GetCacheKey, IProvider, ProviderHook, ScopeAccessRule } from '../provider/IProvider';
import { SingleToken } from '../token/SingleToken';
import { BindToken } from '../token/BindToken';
import { MapFn } from '../utils/fp';
import { addClassMeta, getClassMeta } from '../metadata/class';
import { type constructor } from '../utils/basic';

/**
 * Decides whether a registration is copied into a scope when that scope is
 * created (or when the registration is added). `prev` is the result of the
 * rules before it, so rules chain. Set with {@link scope} or `registration.when(...)`.
 *
 * @example
 * const onlyRequest: ScopeMatchRule = (s) => s.hasTag('request');
 */
export type ScopeMatchRule = (s: IContainer, prev: boolean) => boolean;

/**
 * A provider transform usable in both places: `registration.pipe(...)` calls
 * `mapProvider`, `@register(...)` calls `mapRegistration`. Build one with
 * {@link registerPipe}; `singleton()`, `lazy()`, `scopeAccess()` etc. are all pipes.
 */
export interface ProviderPipe<T = unknown> {
  mapProvider(p: IProvider<T>): IProvider<T>;

  mapRegistration(r: IRegistration<T>): IRegistration<T>;
}

/** Narrows `obj` to a {@link ProviderPipe}. */
export const isProviderPipe = <T>(obj: unknown): obj is ProviderPipe<T> =>
  obj !== null && typeof obj === 'object' && 'mapProvider' in obj;

/**
 * Turns a provider transform into a {@link ProviderPipe}, so it works both in
 * `@register(...)` and in `registration.pipe(...)`.
 *
 * @example
 * const cached = <T>() => registerPipe<T>((p) => p.singleton());
 *
 * @register(bindTo('Cache'), cached())
 * class Cache {}
 */
export const registerPipe = <T>(mapProvider: (p: IProvider<T>) => IProvider<T>): ProviderPipe<T> => ({
  mapProvider,
  mapRegistration: (r) => r.pipe(mapProvider),
});

/**
 * Anything that can name a binding key: a raw key, or a token that knows how to bind itself.
 */
export type Bindable<T = any> = DependencyKey | BindToken<T>;

/** Normalizes a {@link Bindable}: a raw key becomes a `SingleToken`, a token is returned as is. */
export const toBindToken = <T>(target: Bindable<T>): BindToken<T> =>
  isDependencyKey(target) ? new SingleToken<T>(target) : target;

/**
 * Everything accepted at provider level - by `IRegistration.pipe(...)`.
 */
export type ProviderMapper<T = any> = MapFn<IProvider<T>> | ProviderPipe<T>;

/** Normalizes a {@link ProviderMapper} to a plain provider transform. */
export const toProviderFn = <T>(mapper: ProviderMapper<T>): MapFn<IProvider<T>> =>
  isProviderPipe<T>(mapper) ? mapper.mapProvider.bind(mapper) : mapper;

/**
 * Everything accepted at registration level - by `@register(...)`.
 */
export type RegistrationMapper<T = any> = MapFn<IRegistration<T>> | ProviderPipe<T> | Bindable<T>;

/** Normalizes a {@link RegistrationMapper} to a plain registration transform (a `Bindable` becomes `bindTo(...)`). */
export const toRegistrationFn = <T>(mapper: RegistrationMapper<T>): MapFn<IRegistration<T>> => {
  if (typeof mapper === 'function') return mapper;
  if (isProviderPipe<T>(mapper)) return (r) => mapper.mapRegistration(r);
  return bindTo(mapper);
};

/**
 * A recipe for putting one provider into matching scopes. Created with
 * `Registration.fromClass` / `fromValue` / `fromFn` / `fromKey` and added with
 * `container.addRegistration(...)`; `applyTo(scope)` registers the provider
 * when the scope rules match.
 */
export interface IRegistration<T = any> extends IContainerModule {
  getKeyOrFail(): DependencyKey;

  when(...predicates: ScopeMatchRule[]): this;

  bindToKey(key: DependencyKey): this;

  bindTo(key: Bindable): this;

  pipe(...mappers: ProviderMapper<T>[]): this;

  bindToAlias(alias: DependencyKey): this;
}

/** The dependency type `T` of an `IRegistration<T>`. */
export type ReturnTypeOfRegistration<T> = T extends IRegistration<infer R> ? R : never;

const METADATA_KEY = 'registration';
/** Reads the registration transforms written on a class by {@link register}. */
export const getTransformers = (Target: constructor<unknown>) =>
  getClassMeta<MapFn<IRegistration>[]>(Target, METADATA_KEY) ?? [];

/**
 * Class decorator that configures how `Registration.fromClass(Target)` registers
 * the class: binding keys, scope rules and provider pipes. Without a key the
 * class name is used.
 *
 * Pass a key or a token directly - `@register(ILoggerToken)`, `@register('ILogger')`.
 * It is bound exactly as `bindTo(...)` would bind it, so wrapping it in
 * `bindTo(...)` here is redundant; `bindTo` is for the fluent
 * `Registration...` chain.
 *
 * @example
 * @register(ILoggerToken, scope((s) => s.hasTag('application')), singleton())
 * class Logger implements ILogger {}
 *
 * container.addRegistration(Registration.fromClass(Logger));
 */
export const register = (...mappers: RegistrationMapper[]) =>
  addClassMeta(METADATA_KEY, (acc: MapFn<IRegistration>[] | undefined) => {
    const result = mappers.map((m) => toRegistrationFn(m));
    return acc ? [...result, ...acc] : result;
  });

/**
 * Binds a registration to one or more keys or tokens. A `SingleToken` binds its
 * key; an alias token (`toSingleAlias`, `toGroupAlias`) adds an alias.
 *
 * Inside `@register(...)` pass the token itself instead - `@register(ILoggerToken)`
 * binds it the same way, so `@register(bindTo(ILoggerToken))` is redundant.
 *
 * @example
 * Registration.fromClass(Logger).bindTo(ILoggerToken);
 *
 * @example
 * Registration.fromValue(config).bindTo('Config');
 */
export const bindTo =
  (...tokens: Bindable[]): MapFn<IRegistration> =>
  (r) => {
    for (const token of tokens) {
      toBindToken(token).bindTo(r);
    }
    return r;
  };

/**
 * Limits which scopes a registration is copied into. Without it, a registration
 * lands in every scope, so a `singleton()` becomes one instance per scope.
 *
 * @example
 * @register(bindTo('Repo'), scope((s) => s.hasTag('request')))
 * class Repo {}
 */
export const scope =
  (...rules: ScopeMatchRule[]): MapFn<IRegistration> =>
  (r) =>
    r.when(...rules);

/**
 * Appends fixed values after the runtime args handed to the provider.
 *
 * @example
 * @register(bindTo('Client'), appendArgs('https://api.example.com'))
 * class Client {
 *   constructor(@inject(arg(0)) readonly baseUrl: string) {}
 * }
 */
export const appendArgs = <T>(...extraArgs: unknown[]) =>
  registerPipe<T>((p) => p.addArgsFn(({ args = [] }) => [...args, ...extraArgs]));

/**
 * Appends values computed at resolve time after the runtime args.
 *
 * @example
 * @register(bindTo('Client'), appendArgsFn(({ scope }) => [scope.resolve('API_URL')]))
 * class Client {}
 */
export const appendArgsFn = <T>(fn: ArgsFn) =>
  registerPipe<T>((p) => p.addArgsFn((options) => [...(options.args ?? []), ...fn(options)]));

/**
 * Controls from which scopes the provider may be resolved (unlike {@link scope},
 * which controls where it is registered). A denied lookup falls through to the parent.
 *
 * @example
 * @register(bindTo('Admin'), scopeAccess(({ invocationScope }) => invocationScope.hasTag('admin')))
 * class AdminService {}
 */
export const scopeAccess = <T>(rule: ScopeAccessRule) => registerPipe<T>((p) => p.addAccessRule(rule));

/**
 * Resolves the dependency as a proxy that constructs the real instance on first
 * member access.
 *
 * @example
 * @register(bindTo('Heavy'), lazy())
 * class HeavyService {}
 */
export const lazy = <T>() => registerPipe<T>((p) => p.lazy());

/**
 * Marks the provider for eager resolution when the scope is set up; needs
 * `container.useModule(new AutoResolveModule())`.
 */
export const autoResolve = <T>() => registerPipe<T>((p) => p.autoResolve());

/**
 * Wraps or replaces the resolved dependency. Order relative to `lazy()` decides
 * whether the proxy or the real instance is decorated.
 *
 * @example
 * @register(bindTo('Api'), decorate((api, scope) => new LoggingApi(api)))
 * class Api {}
 */
export const decorate = (...fns: DecorateFn[]) => registerPipe((p) => p.map(...fns));

/**
 * Caches the dependency per provider, which means per scope the registration
 * was copied into (combine with {@link scope}). `getCacheKey` receives the
 * runtime args and caches one instance per distinct key.
 *
 * @example
 * @register(bindTo('Db'), scope((s) => s.hasTag('application')), singleton())
 * class Db {}
 *
 * @example
 * // one instance per tenant id passed as the first runtime arg
 * @register(bindTo('TenantDb'), singleton(([tenantId]) => String(tenantId)))
 * class TenantDb {}
 */
export const singleton = <T = unknown>(getCacheKey?: GetCacheKey) => registerPipe<T>((p) => p.singleton(getCacheKey));

/**
 * Registration-level form of `IProvider.onResolved`: attaches provider hooks to
 * the piped registration's provider.
 */
export const onResolve = <T = unknown>(...hooks: ProviderHook[]) => registerPipe<T>((p) => p.onResolved(...hooks));
