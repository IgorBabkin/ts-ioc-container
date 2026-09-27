import { type DependencyKey, type IContainer } from '../container/IContainer';
import { forwardArgs, InjectionToken } from './InjectionToken';
import { type ArgsFn, type ResolveOptions } from '../provider/IProvider';
import { type Serializable } from '../utils/basic';
import { ProxyRegistry } from '../utils/ProxyRegistry';
import { DependencyNotFoundError } from '../errors/DependencyNotFoundError';
import {
  type FeatureContext,
  type IFeatureFlags,
  IFeatureContextToken,
  IFeatureFlagsToken,
} from '../feature/IFeatureFlags';

export type FeatureTokenOptions = { getArgsFn?: ArgsFn; isLazy?: boolean; tags?: string[] };

/** What a feature token reads from its flag: whether it is on, and the named variant served, if any. */
export type FeatureEvaluation<V extends string = string> = { enabled: boolean; variant?: V };

/**
 * A dependency switched by a multi-variant feature flag. The implementations
 * decide where they belong - a bindable token declares itself
 *
 * - a named variant with `variantOf(feature, name)`: used while the flag serves `name`;
 * - the primary variant with `primaryVariantOf(feature)`: used while the flag is
 *   on and no named variant implementation matches;
 * - the fallback with `fallbackOf(feature)`: used otherwise - the flag is off,
 *   or its client throws.
 *
 * A flag always has a fallback: resolving a feature without one registered fails.
 *
 * `flag` is the flag's name on the flag service. `V` narrows the variant names
 * implementations may claim. The flag client comes from `IFeatureFlagsToken`
 * and the context from `IFeatureContextToken`, both resolved from the resolving
 * scope, on every resolution.
 *
 * Subclasses change only how the served variant is evaluated - see
 * `ToggleFeatureToken`, the on/off case.
 *
 * @example
 * const CheckoutButtonToken = new MultiVariantFeatureToken<IButton, 'blue' | 'green'>('checkout-button');
 *
 * @register(new SingleToken<IButton>('GreyButton').fallbackOf(CheckoutButtonToken))
 * class GreyButton implements IButton {}
 *
 * @register(new SingleToken<IButton>('BlueButton').variantOf(CheckoutButtonToken, 'blue'))
 * class BlueButton implements IButton {}
 *
 * @register(new SingleToken<IButton>('GreenButton').primaryVariantOf(CheckoutButtonToken))
 * class GreenButton implements IButton {}
 */
export class MultiVariantFeatureToken<T = any, V extends string = string>
  extends InjectionToken<T>
  implements Serializable
{
  private readonly _getArgsFn: ArgsFn;
  private readonly _isLazy: boolean;

  constructor(
    readonly flag: string,
    { getArgsFn = forwardArgs, isLazy = false, tags = [] }: FeatureTokenOptions = {},
  ) {
    super(tags);
    this._getArgsFn = getArgsFn;
    this._isLazy = isLazy;
  }

  /** The alias an implementation of the variant `name` is bound to. Declare it with `token.variantOf(feature, name)`. */
  variantAlias(name: V): DependencyKey {
    return `feature:${this.flag}:variant:${name}`;
  }

  /** The alias the primary variant is bound to. Declare it with `token.primaryVariantOf(feature)`. */
  primaryAlias(): DependencyKey {
    return `feature:${this.flag}:primary`;
  }

  /** The alias the fallback is bound to. Declare it with `token.fallbackOf(feature)`. */
  fallbackAlias(): DependencyKey {
    return `feature:${this.flag}:fallback`;
  }

  /**
   * @throws {DependencyNotFoundError} when the flag has no fallback, or the flag client, the feature context or the selected implementation cannot be resolved.
   * @throws {ContainerDisposedError} when `s` has already been disposed.
   */
  resolve(s: IContainer, { args = [], lazy }: ResolveOptions = {}): T {
    const resolveSelected = () =>
      s.resolveOneByAlias<T>(this.selectAlias(s), { args: this._getArgsFn({ scope: s, args }) });
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

  /** Whether the flag is on for `context`, and the named variant it serves, if any. */
  protected evaluate(flags: IFeatureFlags, context: FeatureContext): FeatureEvaluation<V> {
    const served = flags.getVariant(this.flag, context);
    return served.enabled
      ? { enabled: true, variant: served.name as V }
      : { enabled: flags.isEnabled(this.flag, context) };
  }

  private copy(overrides: FeatureTokenOptions): this {
    const Self = this.constructor as new (flag: string, options: FeatureTokenOptions) => this;
    return new Self(this.flag, {
      getArgsFn: this._getArgsFn,
      isLazy: this._isLazy,
      tags: this.getTags(),
      ...overrides,
    });
  }

  /**
   * The alias of the served variant's implementation, or of the fallback.
   *
   * @throws {DependencyNotFoundError} when the flag has no fallback, or the flag client or the feature context cannot be resolved.
   */
  private selectAlias(s: IContainer): DependencyKey {
    const fallback = this.fallbackAlias();
    if (!s.hasAlias(fallback)) {
      throw new DependencyNotFoundError(
        `Feature flag "${this.flag}" has no fallback: a flag always has one. ` +
          `Register it with @register(token.fallbackOf(feature)) in this scope or a parent.`,
      );
    }

    const flags = IFeatureFlagsToken.resolve(s);
    const context = IFeatureContextToken.resolve(s);
    let served: FeatureEvaluation<V> = { enabled: false };
    try {
      served = this.evaluate(flags, context);
    } catch {
      // A flag always has a fallback: a failing client serves it.
    }
    const candidates = [
      served.variant === undefined ? undefined : this.variantAlias(served.variant),
      served.enabled ? this.primaryAlias() : undefined,
    ];
    return candidates.find((alias) => alias !== undefined && s.hasAlias(alias)) ?? fallback;
  }
}
