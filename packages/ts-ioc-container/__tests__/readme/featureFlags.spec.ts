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
  ToggleFeatureToken,
} from '../../lib';

/**
 * Checkout Domain - Feature Flags
 *
 * A flag chooses which implementation is injected; the consumer depends on one
 * type and never sees the flag. Every flag has a fallback, given when the token
 * is created. It is served whenever the flag serves nothing, serves a variant
 * with no implementation, or the flag client fails.
 *
 * `MultiVariantFeatureToken` binds one implementation per variant with
 * `token.variant(name)`; `ToggleFeatureToken` is its on/off case, with the
 * single variant `token.enabled()`.
 *
 * The flag client is any object with `isEnabled(name, context)` and
 * `getVariant(name, context)` - an Unleash client works as is:
 *   container.addRegistration(R.fromValue(unleash).bindTo(IFeatureFlagsToken));
 */

// Toggle: new checkout on / off
interface IPaymentGateway {
  pay(amount: number): string;
}

class LegacyGateway implements IPaymentGateway {
  pay(amount: number) {
    return `legacy charged ${amount}`;
  }
}

// The fallback is part of the token - it cannot be created without one
const PaymentGatewayToken = new ToggleFeatureToken<IPaymentGateway>('new-checkout', { fallback: LegacyGateway });

@register(PaymentGatewayToken.enabled())
class StripeGateway implements IPaymentGateway {
  pay(amount: number) {
    return `stripe charged ${amount}`;
  }
}

// Multi-variant: A/B/n experiment on the checkout button
interface ICheckoutButton {
  render(): string;
}

class GreyButton implements ICheckoutButton {
  render() {
    return 'grey button';
  }
}

const CheckoutButtonToken = new MultiVariantFeatureToken<ICheckoutButton, 'blue' | 'green'>('checkout-button', {
  fallback: GreyButton,
});

@register(CheckoutButtonToken.variant('blue'))
class BlueButton implements ICheckoutButton {
  render() {
    return 'blue button';
  }
}

@register(CheckoutButtonToken.variant('green'))
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
