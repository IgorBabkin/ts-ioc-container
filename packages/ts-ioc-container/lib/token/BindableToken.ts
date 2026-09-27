import { type DependencyKey, type IContainer } from '../container/IContainer';
import { forwardArgs, InjectionToken } from './InjectionToken';
import { type BindToken } from './BindToken';
import { type IRegistration } from '../registration/IRegistration';
import { type ArgsFn, type ResolveOptions } from '../provider/IProvider';
import { type Serializable } from '../utils/basic';
import { type MultiVariantFeatureToken } from './MultiVariantFeatureToken';

// Blocks inference from `name` so it must be one of the feature's variants (TS < 5.4 has no NoInfer).
type NoInferVariant<V> = [V][V extends unknown ? 0 : never];

/** Internal state of a {@link BindableToken}, propagated by its modifiers. Never pass it from outside. */
export type BindableTokenOptions = {
  getArgsFn?: ArgsFn;
  isLazy?: boolean;
  tags?: string[];
  memberships?: DependencyKey[];
};

/**
 * Base of every token a registration can be bound to (`SingleToken`,
 * `SingleAliasToken`, `GroupAliasToken`): a key, the args / lazy / tags state
 * every modifier copies, and the feature memberships the token declares.
 *
 * `T` is the type bound to the token, `R` the type resolving it returns (an
 * alias group resolves `T[]`). A subclass says only how it binds (`bindKey`)
 * and how it resolves.
 */
export abstract class BindableToken<T = any, R = T> extends InjectionToken<R> implements BindToken<T>, Serializable {
  private readonly getArgsFn: ArgsFn;
  private readonly isLazyByDefault: boolean;
  private readonly memberships: DependencyKey[];

  constructor(
    readonly token: DependencyKey,
    { getArgsFn = forwardArgs, isLazy = false, tags = [], memberships = [] }: BindableTokenOptions = {},
  ) {
    super(tags);
    this.getArgsFn = getArgsFn;
    this.isLazyByDefault = isLazy;
    this.memberships = memberships;
  }

  /** Binds `r` under this token, and into every feature this token declared itself a variant or fallback of. */
  bindTo(r: IRegistration<T>): void {
    this.bindKey(r);
    for (const alias of this.memberships) {
      r.bindToAlias(alias);
    }
  }

  /**
   * Declares the dependency bound to this token the implementation of `feature`
   * while the flag serves the variant `name`.
   *
   * @example
   * const BlueButtonToken = new SingleToken<IButton>('BlueButton').variantOf(CheckoutButtonToken, 'blue');
   *
   * @register(BlueButtonToken)
   * class BlueButton implements IButton {}
   */
  variantOf<V extends string>(feature: MultiVariantFeatureToken<T, V>, name: NoInferVariant<V>): this {
    return this.copy({ memberships: [...this.memberships, feature.variantAlias(name)] });
  }

  /**
   * Declares the dependency bound to this token the primary variant of
   * `feature`: used while the flag is on and no named variant implementation
   * matches. The enabled implementation of a `ToggleFeatureToken`.
   *
   * @example
   * const StripeGatewayToken = new SingleToken<IPaymentGateway>('StripeGateway').primaryVariantOf(PaymentGatewayToken);
   *
   * @register(StripeGatewayToken)
   * class StripeGateway implements IPaymentGateway {}
   */
  primaryVariantOf(feature: MultiVariantFeatureToken<T, string>): this {
    return this.copy({ memberships: [...this.memberships, feature.primaryAlias()] });
  }

  /**
   * Declares the dependency bound to this token the fallback of `feature`: used
   * whenever no variant implementation applies - the flag is off, serves
   * nothing implemented, or its client throws.
   *
   * @example
   * const LegacyGatewayToken = new SingleToken<IPaymentGateway>('LegacyGateway').fallbackOf(PaymentGatewayToken);
   *
   * @register(LegacyGatewayToken)
   * class LegacyGateway implements IPaymentGateway {}
   */
  fallbackOf(feature: MultiVariantFeatureToken<T, string>): this {
    return this.copy({ memberships: [...this.memberships, feature.fallbackAlias()] });
  }

  args(...newArgs: unknown[]): this {
    const parentFn = this.getArgsFn;
    return this.copy({ getArgsFn: (options) => [...parentFn(options), ...newArgs] });
  }

  argsFn(fn: (s: IContainer) => unknown[]): this {
    const parentFn = this.getArgsFn;
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

  /** Binds `r` under this token's own key or alias. */
  protected abstract bindKey(r: IRegistration<T>): void;

  /** The options a subclass resolves with: runtime args first, then this token's args; lazy if either asks. */
  protected toResolveOptions(s: IContainer, { args = [], lazy }: ResolveOptions = {}): ResolveOptions {
    // `lazy` stays undefined unless someone asked, so a provider's own `lazy()` pipe still applies.
    return { args: this.getArgsFn({ scope: s, args }), lazy: this.isLazyByDefault || lazy };
  }

  private copy(overrides: BindableTokenOptions): this {
    const Self = this.constructor as new (token: DependencyKey, options: BindableTokenOptions) => this;
    return new Self(this.token, {
      getArgsFn: this.getArgsFn,
      isLazy: this.isLazyByDefault,
      tags: this.getTags(),
      memberships: this.memberships,
      ...overrides,
    });
  }
}
