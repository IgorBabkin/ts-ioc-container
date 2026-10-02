import { IInjector, InjectOptions, Injector } from './IInjector';
import { type constructor, type Instance } from '../utils/basic';
import { resolveConstructor } from '../metadata/target';
import { addParamMeta, getParamMeta } from '../metadata/parameter';
import { ProviderOptions } from '../provider/IProvider';
import { InjectFn } from '../hooks/hook';
import { type DependencyKey } from '../container/IContainer';
import { type InjectionToken } from '../token/InjectionToken';
import { toToken } from '../token/toToken';

/**
 * The default injector: builds a class by calling each constructor parameter's
 * `@inject(...)` function. Parameters without `@inject` receive `undefined`.
 * Needs `reflect-metadata` imported once at the entrypoint.
 *
 * @example
 * const container = new Container({ injector: new MetadataInjector() });
 */
export class MetadataInjector extends Injector implements IInjector {
  protected createInstance<T>(Target: constructor<T>, { scope, args: deps = [] }: InjectOptions): T {
    const args = resolveArgs(Target)({ scope, args: deps });
    return new Target(...args);
  }
}

const hookMetaKey = (methodName = 'constructor') => `inject:${methodName}`;

/**
 * Injects a dependency into a constructor parameter.
 *
 * `fn` receives the resolution context - the `scope` the instance is built in and
 * the runtime `args` it is built with - and returns the value to inject. That is
 * the whole contract: a token, key or class is resolved with {@link by}, a
 * runtime argument picked with {@link arg}, and a mapped value is
 * `pipe(fn, ...mappers)`.
 *
 * @example
 * class App {
 *   constructor(
 *     @inject(by(ILoggerToken)) private logger: ILogger,
 *     @inject(pipe(by(ConfigToken), (c) => c.apiUrl)) private apiUrl: string,
 *     @inject(arg(0)) private tenantId: string,
 *   ) {}
 * }
 */
export function inject<T>(fn: InjectFn<T>): ParameterDecorator {
  return (target, propertyKey, parameterIndex) => {
    addParamMeta(hookMetaKey(propertyKey as string), () => fn)(resolveConstructor(target), propertyKey, parameterIndex);
  };
}

/**
 * The `InjectFn` which resolves `target` - an `InjectionToken`, a `DependencyKey`
 * or a class - from the scope, handing it the runtime args of the class being
 * constructed (see "Runtime args flow through tokens" in the README) and the
 * `lazy` flag: `@inject(by(Token))`, `@inject(by('key'))`, `@inject(by(Logger))`.
 * Being a function, it composes: `pipe(by(Config), (c) => c.apiUrl)`.
 *
 * @throws {UnsupportedTokenTypeError} when `target` is none of the three.
 */
export const by = <T>(target: InjectionToken<T> | DependencyKey | constructor<T>): InjectFn<T> => {
  const token = toToken(target);
  return ({ scope, ...options }) => token.resolve(scope, options);
};

/**
 * Injects the first runtime arg matching `predicate`, or `undefined`.
 *
 * @example
 * constructor(@inject(argsFn((value) => typeof value === 'string')) readonly name: string) {}
 */
export const argsFn =
  <T = unknown>(predicate: (value: unknown, index: number) => boolean): InjectFn<T> =>
  ({ args = [] }): T =>
    args.find((value, index) => predicate(value, index)) as T;

/**
 * Injects the runtime arg at `index`, or `undefined`. Args arrive as passed:
 * a token in the args list is not resolved.
 *
 * @example
 * constructor(@inject(arg(0)) readonly baseUrl: string) {}
 * // Token.args('https://api.example.com').resolve(scope)
 */
export const arg = <T = unknown>(index: number): InjectFn<T> => argsFn<T>((value, i) => i === index);

/**
 * Resolves, in the current scope, the token `pick` finds among the runtime args -
 * for a class whose dependency is chosen by the caller passing its token as an arg.
 * The token is resolved without args. Pairs with {@link findArgOrFail}.
 *
 * @example
 * constructor(@inject(byArgs(findArgOrFail(isRepositoryToken))) readonly repository: IRepository) {}
 * // IEntityManagerToken.resolve(scope, { args: [IUserRepositoryToken] })
 *
 * @throws {ArgumentNotFoundError} when `pick` is `findArgOrFail(...)` and no arg matches.
 * @throws {DependencyNotFoundError} when the picked token is not registered in the scope chain.
 */
export const byArgs =
  <T>(pick: (args: unknown[]) => InjectionToken<T>): InjectFn<T> =>
  ({ scope, args = [] }) =>
    pick(args).resolve(scope);

/** Injects the whole runtime args array. */
export const args: InjectFn<unknown[]> = ({ args = [] }) => args;

/**
 * Resolves the arguments annotated with `@inject` on `target`'s constructor, or on
 * its `methodName` method, by calling each parameter's `InjectFn` with `options`.
 *
 * `target` is the class or any instance of it - a proxy included, since it is
 * unwrapped on the way to the metadata (see {@link resolveConstructor}).
 */
export const resolveArgs = (target: constructor<unknown> | Instance, methodName?: string) => {
  const fns = getParamMeta(hookMetaKey(methodName), target) as InjectFn[];
  return (options: ProviderOptions): unknown[] => fns.map((fn) => fn(options));
};
