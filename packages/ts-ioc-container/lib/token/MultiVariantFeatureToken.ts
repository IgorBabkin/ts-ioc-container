import { type DependencyKey, type IContainer } from '../container/IContainer';
import { forwardArgs, InjectionToken } from './InjectionToken';
import { SingleToken } from './SingleToken';
import { type BindToken } from './BindToken';
import { type IRegistration } from '../registration/IRegistration';
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
 * A dependency switched by a multi-variant feature flag: one implementation per
 * variant the flag serves. A flag always has a fallback: the implementation
 * bound to the token itself is the baseline, and the ones bound to
 * `variant(name)` overlay it while the flag serves `name`. The fallback is used
 * whenever the flag serves no variant, serves one with no implementation, or
 * its client throws.
 *
 * `V` narrows the variant names the token accepts. The flag client comes from
 * `IFeatureFlagsToken` and the context from `IFeatureContextToken`, both
 * resolved from the resolving scope, on every resolution. Resolving the plain
 * key, not the token, yields the fallback.
 *
 * Subclasses change only how the served variant is evaluated - see
 * `ToggleFeatureToken`, the on/off case.
 *
 * @example
 * const CheckoutButtonToken = new MultiVariantFeatureToken<IButton, 'blue' | 'green'>('IButton', 'checkout-button');
 *
 * @register(bindTo(CheckoutButtonToken))
 * class GreyButton implements IButton {}
 *
 * @register(bindTo(CheckoutButtonToken.variant('blue')))
 * class BlueButton implements IButton {}
 */
export class MultiVariantFeatureToken<T = any, V extends string = string>
  extends InjectionToken<T>
  implements BindToken<T>, Serializable
{
  private readonly _getArgsFn: ArgsFn;
  private readonly _isLazy: boolean;

  constructor(
    readonly token: DependencyKey,
    readonly flag: string,
    { getArgsFn = forwardArgs, isLazy = false, tags = [] }: FeatureTokenOptions = {},
  ) {
    super(tags);
    this._getArgsFn = getArgsFn;
    this._isLazy = isLazy;
  }

  /** The implementation used while the flag serves the variant `name`. Bind it with `bindTo(token.variant(name))`. */
  variant(name: V): SingleToken<T> {
    return new SingleToken<T>(`${this.token.toString()}@${this.flag}:${name}`);
  }

  /**
   * @throws {DependencyNotFoundError} when the flag client, the feature context or the selected implementation cannot be resolved.
   * @throws {ContainerDisposedError} when `s` has already been disposed.
   */
  resolve(s: IContainer, { args = [], lazy }: ResolveOptions = {}): T {
    const resolveSelected = () => s.resolve<T>(this.selectKey(s), { args: this._getArgsFn({ scope: s, args }) });
    return ProxyRegistry.getInstance().toLazyIf(resolveSelected as () => T & object, this._isLazy || lazy);
  }

  bindTo(r: IRegistration<T>) {
    r.bindToKey(this.token);
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
    return this.token.toString();
  }

  /** The variant the flag serves for `context`, or `undefined` when it serves none. */
  protected evaluate(flags: IFeatureFlags, context: FeatureContext): V | undefined {
    const served = flags.getVariant(this.flag, context);
    return served.enabled ? (served.name as V) : undefined;
  }

  private copy(overrides: FeatureTokenOptions): this {
    const Self = this.constructor as new (token: DependencyKey, flag: string, options: FeatureTokenOptions) => this;
    return new Self(this.token, this.flag, {
      getArgsFn: this._getArgsFn,
      isLazy: this._isLazy,
      tags: this.getTags(),
      ...overrides,
    });
  }

  /**
   * @throws {DependencyNotFoundError} when the flag client or the feature context cannot be resolved.
   */
  private selectKey(s: IContainer): DependencyKey {
    const flags = IFeatureFlagsToken.resolve(s);
    const context = IFeatureContextToken.resolve(s);
    let served: V | undefined;
    try {
      served = this.evaluate(flags, context);
    } catch {
      // A flag always has a fallback: a failing client serves it.
    }
    const variantKey = served === undefined ? undefined : this.variant(served).token;
    return variantKey !== undefined && s.hasRegistration(variantKey) ? variantKey : this.token;
  }
}
