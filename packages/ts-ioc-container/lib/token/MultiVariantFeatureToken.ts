import { type DependencyKey, type IContainer } from '../container/IContainer';
import { forwardArgs, InjectionToken } from './InjectionToken';
import { SingleToken } from './SingleToken';
import { type Injectable, toToken } from './toToken';
import { type ArgsFn, type ResolveOptions } from '../provider/IProvider';
import { type Serializable } from '../utils/basic';
import { ProxyRegistry } from '../utils/ProxyRegistry';
import {
  type FeatureContext,
  type IFeatureFlags,
  IFeatureContextToken,
  IFeatureFlagsToken,
} from '../feature/IFeatureFlags';

export type FeatureTokenOptions = { getArgsFn?: ArgsFn; isLazy?: boolean; tags?: string[] };

/**
 * What a feature token falls back to. Required: a flag always has a fallback.
 * Any `Injectable` - a token, a key, a class or an `InjectFn` - resolved with
 * the same scope and args the feature token was resolved with.
 */
export type MultiVariantFeatureTokenContext<T = any> = { fallback: Injectable<T> };

/**
 * A dependency switched by a multi-variant feature flag: one implementation per
 * variant the flag serves. A flag always has a fallback, so the token cannot be
 * created without one: `context.fallback` is resolved whenever the flag serves
 * no variant, serves one with no implementation, or its client throws.
 *
 * `flag` is the flag's name on the flag service, and namespaces the variant
 * keys. `V` narrows the variant names the token accepts. The flag client comes
 * from `IFeatureFlagsToken` and the context from `IFeatureContextToken`, both
 * resolved from the resolving scope, on every resolution.
 *
 * Subclasses change only how the served variant is evaluated - see
 * `ToggleFeatureToken`, the on/off case.
 *
 * @example
 * const CheckoutButtonToken = new MultiVariantFeatureToken<IButton, 'blue' | 'green'>('checkout-button', {
 *   fallback: GreyButton,
 * });
 *
 * @register(CheckoutButtonToken.variant('blue'))
 * class BlueButton implements IButton {}
 */
export class MultiVariantFeatureToken<T = any, V extends string = string>
  extends InjectionToken<T>
  implements Serializable
{
  private readonly _getArgsFn: ArgsFn;
  private readonly _isLazy: boolean;

  constructor(
    readonly flag: string,
    readonly context: MultiVariantFeatureTokenContext<T>,
    { getArgsFn = forwardArgs, isLazy = false, tags = [] }: FeatureTokenOptions = {},
  ) {
    super(tags);
    this._getArgsFn = getArgsFn;
    this._isLazy = isLazy;
  }

  /** The implementation used while the flag serves the variant `name`. Register it with `@register(token.variant(name))`. */
  variant(name: V): SingleToken<T> {
    return new SingleToken<T>(`${this.flag}:${name}`);
  }

  /**
   * @throws {DependencyNotFoundError} when the flag client, the feature context or the selected implementation cannot be resolved.
   * @throws {ContainerDisposedError} when `s` has already been disposed.
   */
  resolve(s: IContainer, { args = [], lazy }: ResolveOptions = {}): T {
    const resolveSelected = () => {
      const options = { args: this._getArgsFn({ scope: s, args }) };
      const key = this.selectVariantKey(s);
      return key === undefined ? toToken(this.context.fallback).resolve(s, options) : s.resolve<T>(key, options);
    };
    return ProxyRegistry.getInstance().toLazyIf(resolveSelected as () => T & object, this._isLazy || lazy);
  }

  args(...newArgs: unknown[]): this {
    const parentFn = this._getArgsFn;
    return this.copy({ getArgsFn: (options) => [...parentFn(options), ...newArgs] });
  }

  argsFn(fn: (s: IContainer) => unknown[]): this {
    const parentFn = this._getArgsFn;
    return this.copy({ getArgsFn: (options) => [...parentFn(options), ...fn(options.scope)] });
  }

  lazy(): this {
    return this.copy({ isLazy: true });
  }

  addTags(...tags: string[]): this {
    return this.copy({ tags: [...this.getTags(), ...tags] });
  }

  toString(): string {
    return this.flag;
  }

  /** The variant the flag serves for `context`, or `undefined` when it serves none. */
  protected evaluate(flags: IFeatureFlags, context: FeatureContext): V | undefined {
    const served = flags.getVariant(this.flag, context);
    return served.enabled ? (served.name as V) : undefined;
  }

  private copy(overrides: FeatureTokenOptions): this {
    const Self = this.constructor as new (
      flag: string,
      context: MultiVariantFeatureTokenContext<T>,
      options: FeatureTokenOptions,
    ) => this;
    return new Self(this.flag, this.context, {
      getArgsFn: this._getArgsFn,
      isLazy: this._isLazy,
      tags: this.getTags(),
      ...overrides,
    });
  }

  /**
   * The key of the served variant's implementation, or `undefined` to use the fallback.
   *
   * @throws {DependencyNotFoundError} when the flag client or the feature context cannot be resolved.
   */
  private selectVariantKey(s: IContainer): DependencyKey | undefined {
    const flags = IFeatureFlagsToken.resolve(s);
    const context = IFeatureContextToken.resolve(s);
    let served: V | undefined;
    try {
      served = this.evaluate(flags, context);
    } catch {
      // A flag always has a fallback: a failing client serves it.
    }
    const key = served === undefined ? undefined : this.variant(served).token;
    return key !== undefined && s.hasRegistration(key) ? key : undefined;
  }
}
