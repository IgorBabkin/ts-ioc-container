import { type FeatureEvaluation, MultiVariantFeatureToken } from './MultiVariantFeatureToken';
import { type FeatureContext, type IFeatureFlags } from '../feature/IFeatureFlags';

/**
 * The on/off case of {@link MultiVariantFeatureToken}: a flag with no named
 * variants, only a primary one, served while `isEnabled` says so. Everything
 * else - the fallback, the context, args and laziness - is the multi-variant
 * token's.
 *
 * @example
 * const PaymentGatewayToken = new ToggleFeatureToken<IPaymentGateway>('new-checkout');
 *
 * @register(new SingleToken<IPaymentGateway>('LegacyGateway').fallbackOf(PaymentGatewayToken))
 * class LegacyGateway implements IPaymentGateway {}
 *
 * @register(new SingleToken<IPaymentGateway>('StripeGateway').primaryVariantOf(PaymentGatewayToken))
 * class StripeGateway implements IPaymentGateway {}
 *
 * class Checkout {
 *   constructor(@inject(by(PaymentGatewayToken)) gateway: IPaymentGateway) {}
 * }
 */
export class ToggleFeatureToken<T = any> extends MultiVariantFeatureToken<T, never> {
  protected override evaluate(flags: IFeatureFlags, context: FeatureContext): FeatureEvaluation<never> {
    return { enabled: flags.isEnabled(this.flag, context) };
  }
}
