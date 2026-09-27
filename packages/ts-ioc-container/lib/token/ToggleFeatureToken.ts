import { MultiVariantFeatureToken } from './MultiVariantFeatureToken';
import { type SingleToken } from './SingleToken';
import { type FeatureContext, type IFeatureFlags } from '../feature/IFeatureFlags';

const ENABLED = 'enabled';

/**
 * The on/off case of {@link MultiVariantFeatureToken}: a flag with a single
 * variant, `enabled`, served while `isEnabled` says so. Everything else - the
 * fallback, the context, args and laziness - is the multi-variant token's.
 *
 * @example
 * const PaymentGatewayToken = new ToggleFeatureToken<IPaymentGateway>('IPaymentGateway', 'new-checkout');
 *
 * @register(bindTo(PaymentGatewayToken))
 * class LegacyGateway implements IPaymentGateway {}
 *
 * @register(bindTo(PaymentGatewayToken.enabled()))
 * class StripeGateway implements IPaymentGateway {}
 *
 * class Checkout {
 *   constructor(@inject(by(PaymentGatewayToken)) gateway: IPaymentGateway) {}
 * }
 */
export class ToggleFeatureToken<T = any> extends MultiVariantFeatureToken<T, typeof ENABLED> {
  /** The implementation used while the flag is enabled. Bind it with `bindTo(token.enabled())`. */
  enabled(): SingleToken<T> {
    return this.variant(ENABLED);
  }

  protected override evaluate(flags: IFeatureFlags, context: FeatureContext): typeof ENABLED | undefined {
    return flags.isEnabled(this.flag, context) ? ENABLED : undefined;
  }
}
