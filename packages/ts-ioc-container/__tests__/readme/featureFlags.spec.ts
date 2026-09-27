import 'reflect-metadata';
import {
  by,
  Container,
  type FeatureContext,
  type FeatureVariant,
  type IFeatureFlags,
  IFeatureContextToken,
  IFeatureFlagsToken,
  inject,
  MultiVariantFeatureToken,
  register,
  Registration as R,
  SingleToken,
  ToggleFeatureToken,
} from '../../lib';

/**
 * Checkout Domain - Feature Flags
 *
 * A flag chooses which implementation is injected; the consumer depends on one
 * type and never sees the flag. The implementations decide where they belong:
 * each one's own token declares it
 *
 * - `.variantOf(feature, name)` - used while the flag serves the variant `name`;
 * - `.primaryVariantOf(feature)` - used while the flag is on and no named
 *   variant implementation matches (the "on" side of a toggle);
 * - `.fallbackOf(feature)` - used otherwise. Every flag has one.
 *
 * `ToggleFeatureToken` is the on/off case of `MultiVariantFeatureToken`: no
 * named variants, only a primary one.
 *
 * The flag client is any object with `isEnabled(name, context)` and
 * `getVariant(name, context)` - an Unleash client works as is:
 *   container.addRegistration(R.fromValue(unleash).bindTo(IFeatureFlagsToken));
 */

// Toggle: new checkout on / off
interface IPaymentGateway {
  pay(amount: number): string;
}

const PaymentGatewayToken = new ToggleFeatureToken<IPaymentGateway>('new-checkout');

// Each implementation's own token declares where it belongs
@register(new SingleToken<IPaymentGateway>('LegacyGateway').fallbackOf(PaymentGatewayToken))
class LegacyGateway implements IPaymentGateway {
  pay(amount: number) {
    return `legacy charged ${amount}`;
  }
}

@register(new SingleToken<IPaymentGateway>('StripeGateway').primaryVariantOf(PaymentGatewayToken))
class StripeGateway implements IPaymentGateway {
  pay(amount: number) {
    return `stripe charged ${amount}`;
  }
}

// Multi-variant: A/B/n experiment on the checkout button
interface ICheckoutButton {
  render(): string;
}

const CheckoutButtonToken = new MultiVariantFeatureToken<ICheckoutButton, 'blue' | 'green'>('checkout-button');

@register(new SingleToken<ICheckoutButton>('GreyButton').fallbackOf(CheckoutButtonToken))
class GreyButton implements ICheckoutButton {
  render() {
    return 'grey button';
  }
}

@register(new SingleToken<ICheckoutButton>('BlueButton').variantOf(CheckoutButtonToken, 'blue'))
class BlueButton implements ICheckoutButton {
  render() {
    return 'blue button';
  }
}

@register(new SingleToken<ICheckoutButton>('GreenButton').variantOf(CheckoutButtonToken, 'green'))
class GreenButton implements ICheckoutButton {
  render() {
    return 'green button';
  }
}

class CheckoutPage {
  constructor(
    @inject(by(PaymentGatewayToken)) private readonly gateway: IPaymentGateway,
    @inject(by(CheckoutButtonToken)) private readonly button: ICheckoutButton,
  ) {}

  render(amount: number) {
    return `${this.button.render()}, ${this.gateway.pay(amount)}`;
  }
}

// Stands in for an Unleash client
class InMemoryFlags implements IFeatureFlags {
  isEnabled(name: string, context?: FeatureContext) {
    return name === 'new-checkout' && context?.userId === 'beta-tester';
  }

  getVariant(name: string, context?: FeatureContext): FeatureVariant {
    const bucket = { 'beta-tester': 'green', 'user-1': 'blue' }[context?.userId ?? ''];
    return name === 'checkout-button' && bucket
      ? { name: bucket, enabled: true }
      : { name: 'disabled', enabled: false };
  }
}

describe('Feature flags', () => {
  const app = new Container({ tags: ['application'] })
    .addRegistration(R.fromValue(new InMemoryFlags()).bindTo(IFeatureFlagsToken))
    .addRegistration(R.fromClass(LegacyGateway))
    .addRegistration(R.fromClass(GreyButton))
    .addRegistration(R.fromClass(StripeGateway))
    .addRegistration(R.fromClass(BlueButton))
    .addRegistration(R.fromClass(GreenButton));

  // The context is per request: each request evaluates the flags for its own user
  const handleRequest = (userId: string) => {
    const request = app.createScope({ tags: ['request'] });
    request.addRegistration(R.fromValue({ userId }).bindTo(IFeatureContextToken));
    return request.resolve(CheckoutPage).render(42);
  };

  it('serves each user the implementations their flags select', () => {
    expect(handleRequest('beta-tester')).toBe('green button, stripe charged 42');
    expect(handleRequest('user-1')).toBe('blue button, legacy charged 42');
  });

  it('serves the fallbacks to everyone else', () => {
    expect(handleRequest('regular-user')).toBe('grey button, legacy charged 42');
  });
});
