import {
  type FeatureTokenOptions,
  MultiVariantFeatureToken,
  type MultiVariantFeatureTokenContext,
} from './MultiVariantFeatureToken';
import { type SingleToken } from './SingleToken';
import { type FeatureContext, type IFeatureFlags } from '../feature/IFeatureFlags';

const ENABLED = 'enabled';

/** What a toggle falls back to while it is off. Required: a flag always has a fallback. */
export type ToggleFeatureTokenContext<T = any> = MultiVariantFeatureTokenContext<T>;

/**
 * The on/off case of {@link MultiVariantFeatureToken}: a flag with a single
 * variant, `enabled`, served while `isEnabled` says so. Everything else - the
 * fallback, the context, args and laziness - is the multi-variant token's.
 *
 * @example
 * const PaymentGatewayToken = new ToggleFeatureToken<IPaymentGateway>('new-checkout', { fallback: LegacyGateway });
 *
 * @register(PaymentGatewayToken.enabled())
 * class StripeGateway implements IPaymentGateway {}
 *
 * class Checkout {
 *   constructor(@inject(by(PaymentGatewayToken)) gateway: IPaymentGateway) {}
 * }
 */
export class ToggleFeatureToken<T = any> extends MultiVariantFeatureToken<T, typeof ENABLED> {
  constructor(flag: string, context: ToggleFeatureTokenContext<T>, options?: FeatureTokenOptions) {
    super(flag, context, options);
  }

  /** The implementation used while the flag is enabled. Register it with `@register(token.enabled())`. */
  enabled(): SingleToken<T> {
    return this.variant(ENABLED);
  }

  protected override evaluate(flags: IFeatureFlags, context: FeatureContext): typeof ENABLED | undefined {
    return flags.isEnabled(this.flag, context) ? ENABLED : undefined;
  }
}
