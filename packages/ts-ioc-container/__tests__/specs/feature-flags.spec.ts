import 'reflect-metadata';
import { It, Mock, Times } from 'moq.ts';
import {
  arg,
  by,
  Container,
  DependencyNotFoundError,
  type FeatureContext,
  type FeatureVariant,
  type IContainer,
  type IFeatureFlags,
  IFeatureContextToken,
  IFeatureFlagsToken,
  inject,
  MultiVariantFeatureToken,
  register,
  Registration as R,
  singleton,
  SingleToken,
  ToggleFeatureToken,
} from '../../lib';

const DISABLED: FeatureVariant = { name: 'disabled', enabled: false };

const serving = (serve: (ctx?: FeatureContext) => FeatureVariant) =>
  new Mock<IFeatureFlags>()
    .setup((f) => f.getVariant(It.IsAny(), It.IsAny()))
    .callback(({ args: [, ctx] }) => serve(ctx as FeatureContext))
    .object();

const toggledBy = (enabledFor: (ctx?: FeatureContext) => boolean) =>
  new Mock<IFeatureFlags>()
    .setup((f) => f.isEnabled(It.IsAny(), It.IsAny()))
    .callback(({ args: [, ctx] }) => enabledFor(ctx as FeatureContext))
    .object();

const createApp = (flags: IFeatureFlags, context: FeatureContext = {}) =>
  new Container({ tags: ['application'] })
    .addRegistration(R.fromValue(flags).bindTo(IFeatureFlagsToken))
    .addRegistration(R.fromValue(context).bindTo(IFeatureContextToken));

interface IButton {
  readonly color: string;
}

class GreyButton implements IButton {
  readonly color = 'grey';
}

const CheckoutButtonToken = new MultiVariantFeatureToken<IButton, 'blue' | 'green'>('checkout-button', {
  fallback: GreyButton,
});

@register(CheckoutButtonToken.variant('blue'))
class BlueButton implements IButton {
  readonly color = 'blue';
}

@register(CheckoutButtonToken.variant('green'))
class GreenButton implements IButton {
  readonly color = 'green';
}

const withButtons = (c: IContainer) =>
  c.addRegistration(R.fromClass(BlueButton)).addRegistration(R.fromClass(GreenButton));

interface IPaymentGateway {
  readonly name: string;
}

class LegacyGateway implements IPaymentGateway {
  readonly name = 'legacy';
}

const PaymentGatewayToken = new ToggleFeatureToken<IPaymentGateway>('new-checkout', { fallback: LegacyGateway });

@register(PaymentGatewayToken.enabled())
class StripeGateway implements IPaymentGateway {
  readonly name = 'stripe';
}

const withGateways = (c: IContainer) => c.addRegistration(R.fromClass(StripeGateway));

describe('Spec: feature flags', () => {
  describe('a multi-variant flag picks one implementation per served variant', () => {
    it('injects the implementation of the served variant', () => {
      const app = withButtons(createApp(serving(() => ({ name: 'green', enabled: true }))));

      expect(CheckoutButtonToken.resolve(app).color).toBe('green');
    });

    it('injects the fallback when no variant is served', () => {
      const app = withButtons(createApp(serving(() => DISABLED)));

      expect(CheckoutButtonToken.resolve(app).color).toBe('grey');
    });

    it('injects the fallback for a served variant without an implementation', () => {
      const app = withButtons(createApp(serving(() => ({ name: 'purple', enabled: true }))));

      expect(CheckoutButtonToken.resolve(app).color).toBe('grey');
    });

    it('injects the fallback when the flag client throws', () => {
      const flags = new Mock<IFeatureFlags>()
        .setup((f) => f.getVariant(It.IsAny(), It.IsAny()))
        .throws(new Error('flag service unavailable'))
        .object();
      const app = withButtons(createApp(flags));

      expect(CheckoutButtonToken.resolve(app).color).toBe('grey');
    });

    it('keeps the consumer unaware of the flag', () => {
      class CheckoutPage {
        constructor(@inject(by(CheckoutButtonToken)) readonly button: IButton) {}
      }
      const app = withButtons(createApp(serving(() => ({ name: 'blue', enabled: true }))));

      expect(app.resolve(CheckoutPage).button.color).toBe('blue');
    });
  });

  describe('the fallback is part of the token', () => {
    it('accepts a registered token as the fallback, keeping its provider pipes', () => {
      const SharedGatewayToken = new SingleToken<IPaymentGateway>('SharedGateway');

      @register(SharedGatewayToken, singleton())
      class SharedGateway implements IPaymentGateway {
        readonly name = 'shared';
      }

      const Token = new ToggleFeatureToken<IPaymentGateway>('new-checkout', { fallback: SharedGatewayToken });
      const app = createApp(toggledBy(() => false)).addRegistration(R.fromClass(SharedGateway));

      expect(Token.resolve(app).name).toBe('shared');
      expect(Token.resolve(app)).toBe(Token.resolve(app));
    });

    it('accepts a key or a function as the fallback', () => {
      const ByKey = new ToggleFeatureToken<string>('limits', { fallback: 'DefaultLimit' });
      const ByFn = new ToggleFeatureToken<string>('limits', { fallback: () => 'computed' });
      const app = createApp(toggledBy(() => false)).addRegistration(R.fromValue('from key').bindTo('DefaultLimit'));

      expect(ByKey.resolve(app)).toBe('from key');
      expect(ByFn.resolve(app)).toBe('computed');
    });
  });

  describe('a toggle is the single-variant case', () => {
    it('is a multi-variant token whose only variant is enabled', () => {
      expect(PaymentGatewayToken).toBeInstanceOf(MultiVariantFeatureToken);
      expect(PaymentGatewayToken.enabled().toString()).toBe(PaymentGatewayToken.variant('enabled').toString());
    });

    it('injects the enabled implementation while the flag is on', () => {
      const app = withGateways(createApp(toggledBy(() => true)));

      expect(PaymentGatewayToken.resolve(app).name).toBe('stripe');
    });

    it('injects the fallback while the flag is off', () => {
      const app = withGateways(createApp(toggledBy(() => false)));

      expect(PaymentGatewayToken.resolve(app).name).toBe('legacy');
    });

    it('injects the fallback when the flag is on but no enabled implementation is registered', () => {
      const app = createApp(toggledBy(() => true));

      expect(PaymentGatewayToken.resolve(app).name).toBe('legacy');
    });

    it('injects the fallback when the flag client throws', () => {
      const flags = new Mock<IFeatureFlags>()
        .setup((f) => f.isEnabled(It.IsAny(), It.IsAny()))
        .throws(new Error('flag service unavailable'))
        .object();
      const app = withGateways(createApp(flags));

      expect(PaymentGatewayToken.resolve(app).name).toBe('legacy');
    });
  });

  describe('flags are evaluated per resolution context', () => {
    const CurrentUserToken = new SingleToken<string>('CurrentUserId');

    const createAppWithRequestContext = (flags: IFeatureFlags) =>
      withGateways(
        new Container({ tags: ['application'] })
          .addRegistration(R.fromValue(flags).bindTo(IFeatureFlagsToken))
          .addRegistration(
            R.fromFn(({ scope }) => ({ userId: CurrentUserToken.resolve(scope) }))
              .bindTo(IFeatureContextToken)
              .when((s) => s.hasTag('request')),
          ),
      );

    const createRequest = (app: IContainer, userId: string) => {
      const request = app.createScope({ tags: ['request'] });
      request.addRegistration(R.fromValue(userId).bindTo(CurrentUserToken));
      return request;
    };

    it('gives two requests different implementations according to their users', () => {
      const app = createAppWithRequestContext(toggledBy((ctx) => ctx?.userId === 'beta-tester'));

      expect(PaymentGatewayToken.resolve(createRequest(app, 'beta-tester')).name).toBe('stripe');
      expect(PaymentGatewayToken.resolve(createRequest(app, 'regular')).name).toBe('legacy');
    });

    it('rejects evaluating a flag without a context instead of falling back silently', () => {
      const app = createAppWithRequestContext(toggledBy(() => true));

      expect(() => PaymentGatewayToken.resolve(app)).toThrow(DependencyNotFoundError);
    });

    it('rejects resolving without a flag client', () => {
      const app = new Container().addRegistration(R.fromValue({}).bindTo(IFeatureContextToken));

      expect(() => PaymentGatewayToken.resolve(app)).toThrow(DependencyNotFoundError);
    });

    it('evaluates the flag on every resolution', () => {
      let served: FeatureVariant = DISABLED;
      const app = withButtons(createApp(serving(() => served)));

      expect(CheckoutButtonToken.resolve(app).color).toBe('grey');
      served = { name: 'blue', enabled: true };
      expect(CheckoutButtonToken.resolve(app).color).toBe('blue');
    });
  });

  it('accepts an Unleash client as is', () => {
    type UnleashContext = {
      userId?: string;
      sessionId?: string;
      remoteAddress?: string;
      environment?: string;
      appName?: string;
      currentTime?: Date;
      properties?: { [key: string]: string | number | undefined };
    };
    type UnleashVariant = { name: string; enabled: boolean; feature_enabled?: boolean; payload?: unknown };
    class Unleash {
      isEnabled(name: string, context?: UnleashContext, fallback?: () => boolean): boolean {
        return context?.userId === 'u1';
      }
      getVariant(name: string, context?: UnleashContext, fallbackVariant?: UnleashVariant): UnleashVariant {
        return context?.userId === 'u1' ? { name: 'blue', enabled: true } : { name: 'disabled', enabled: false };
      }
    }

    const flags: IFeatureFlags = new Unleash();
    const app = withGateways(withButtons(createApp(flags, { userId: 'u1' })));

    expect(CheckoutButtonToken.resolve(app).color).toBe('blue');
    expect(PaymentGatewayToken.resolve(app).name).toBe('stripe');
  });

  describe('tokens stay tokens', () => {
    class PlainGreeter {
      constructor(@inject(arg(0)) private readonly name: string) {}
      greet() {
        return `Hello, ${this.name}`;
      }
    }

    const GreeterToken = new ToggleFeatureToken<{ greet(): string }>('friendly-greeting', { fallback: PlainGreeter });

    @register(GreeterToken.enabled())
    class FriendlyGreeter {
      constructor(@inject(arg(0)) private readonly name: string) {}
      greet() {
        return `Hi there, ${this.name}!`;
      }
    }

    const createGreeters = (flags: IFeatureFlags) => createApp(flags).addRegistration(R.fromClass(FriendlyGreeter));

    it('forwards runtime args and appends token args to the selected implementation', () => {
      const on = createGreeters(toggledBy(() => true));
      const off = createGreeters(toggledBy(() => false));

      expect(GreeterToken.resolve(on, { args: ['Ann'] }).greet()).toBe('Hi there, Ann!');
      expect(GreeterToken.args('Bob').resolve(on).greet()).toBe('Hi there, Bob!');
      expect(GreeterToken.args('Bob').resolve(off).greet()).toBe('Hello, Bob');
    });

    it('keeps the token kind and the fallback across modifiers', () => {
      const specialized = GreeterToken.args('Bob').lazy().addTags('x');

      expect(specialized).toBeInstanceOf(ToggleFeatureToken);
      expect(specialized.context).toBe(GreeterToken.context);
      expect(specialized.enabled().toString()).toBe(GreeterToken.enabled().toString());
    });

    it('defers the flag evaluation to first member access when lazy', () => {
      const flags = new Mock<IFeatureFlags>().setup((f) => f.isEnabled(It.IsAny(), It.IsAny())).returns(false);
      const app = createGreeters(flags.object());

      const greeter = GreeterToken.args('Ann').lazy().resolve(app);
      flags.verify((f) => f.isEnabled(It.IsAny(), It.IsAny()), Times.Never());

      expect(greeter.greet()).toBe('Hello, Ann');
      flags.verify((f) => f.isEnabled(It.IsAny(), It.IsAny()), Times.Once());
    });

    it('leaves the original token unchanged', () => {
      const app = createGreeters(toggledBy(() => false));

      GreeterToken.args('Bob');
      expect(GreeterToken.resolve(app, { args: ['Ann'] }).greet()).toBe('Hello, Ann');
    });
  });
});
