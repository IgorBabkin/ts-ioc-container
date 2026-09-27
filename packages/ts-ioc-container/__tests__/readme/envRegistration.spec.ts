import { bindTo, Container, register, Registration as R, scope, SingleToken } from '../../lib';

/**
 * Environment-based Registration
 *
 * An app often needs a different implementation per deployment environment -
 * a real payment gateway in production, a stub in tests, a verbose one in dev.
 * This is a plain application of `scope()`: tag the container with its env and
 * scope each implementation to the env tag it belongs to. No dedicated API is
 * needed - the same `ScopeMatchRule` mechanism used for `request` / `transaction`
 * scopes applies here too.
 */
type Env = 'prod' | 'dev' | 'test';

interface IPaymentGateway {
  charge(amount: number): string;
}

const PaymentGatewayToken = new SingleToken<IPaymentGateway>('IPaymentGateway');

@register(bindTo(PaymentGatewayToken), scope((c) => c.hasTag('prod')))
class StripeGateway implements IPaymentGateway {
  charge(amount: number): string {
    return `charged $${amount} via Stripe`;
  }
}

@register(bindTo(PaymentGatewayToken), scope((c) => c.hasTag('dev')))
class LoggingGateway implements IPaymentGateway {
  charge(amount: number): string {
    return `[dev] would charge $${amount}`;
  }
}

@register(bindTo(PaymentGatewayToken), scope((c) => c.hasTag('test')))
class FakeGateway implements IPaymentGateway {
  charge(amount: number): string {
    return `faked charge of $${amount}`;
  }
}

const createContainerForEnv = (env: Env) =>
  new Container({ tags: [env] })
    .addRegistration(R.fromClass(StripeGateway))
    .addRegistration(R.fromClass(LoggingGateway))
    .addRegistration(R.fromClass(FakeGateway));

describe('Environment-based registration', function () {
  it('should resolve the implementation whose scope tag matches the container env', function () {
    expect(PaymentGatewayToken.resolve(createContainerForEnv('prod'))).toBeInstanceOf(StripeGateway);
    expect(PaymentGatewayToken.resolve(createContainerForEnv('dev'))).toBeInstanceOf(LoggingGateway);
    expect(PaymentGatewayToken.resolve(createContainerForEnv('test'))).toBeInstanceOf(FakeGateway);
  });

  it('should behave like the environment it was resolved for', function () {
    const gateway = PaymentGatewayToken.resolve(createContainerForEnv('test'));

    expect(gateway.charge(10)).toBe('faked charge of $10');
  });
});
