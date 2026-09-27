import { It, Mock } from 'moq.ts';
import {
  BindableToken,
  Container,
  type FeatureVariant,
  GroupAliasToken,
  type IFeatureFlags,
  IFeatureContextToken,
  IFeatureFlagsToken,
  isInjectionToken,
  MultiVariantFeatureToken,
  Registration as R,
  SingleAliasToken,
  SingleToken,
  ToggleFeatureToken,
  toToken,
} from '../../lib';

const createContainer = (served: FeatureVariant, enabled = served.enabled) =>
  new Container()
    .addRegistration(
      R.fromValue(
        new Mock<IFeatureFlags>()
          .setup((f) => f.getVariant(It.IsAny(), It.IsAny()))
          .returns(served)
          .setup((f) => f.isEnabled(It.IsAny(), It.IsAny()))
          .returns(enabled)
          .object(),
      ).bindTo(IFeatureFlagsToken),
    )
    .addRegistration(R.fromValue({}).bindTo(IFeatureContextToken));

const OFF: FeatureVariant = { name: 'disabled', enabled: false };

describe('MultiVariantFeatureToken', () => {
  it('is an injection token that toToken passes through', () => {
    const token = new MultiVariantFeatureToken('flag');

    expect(isInjectionToken(token)).toBe(true);
    expect(toToken(token)).toBe(token);
  });

  it('derives distinct aliases for variants, the primary variant and the fallback', () => {
    const token = new MultiVariantFeatureToken<unknown, 'blue'>('flag');

    expect(new Set([token.variantAlias('blue'), token.primaryAlias(), token.fallbackAlias()]).size).toBe(3);
    expect(token.args('x').lazy().variantAlias('blue')).toBe(token.variantAlias('blue'));
  });

  it('exposes the flag via toString()', () => {
    expect(new MultiVariantFeatureToken('flag').toString()).toBe('flag');
  });

  it('keeps tags across modifiers without changing the original token', () => {
    const token = new MultiVariantFeatureToken('flag');
    const tagged = token.addTags('a').args(1).addTags('b');

    expect(tagged.hasTag('a')).toBe(true);
    expect(tagged.hasTag('b')).toBe(true);
    expect(token.hasTag('a')).toBe(false);
  });

  it('chains args and argsFn after runtime args in order, for variants and the fallback alike', () => {
    const token = new MultiVariantFeatureToken<string, 'blue'>('flag');
    const withImplementations = (c: Container) =>
      c
        .addRegistration(
          R.fromFn(({ args = [] }) => args.join('-')).bindTo(new SingleToken('Blue').variantOf(token, 'blue')),
        )
        .addRegistration(
          R.fromFn(({ args = [] }) => `fallback ${args.join('-')}`).bindTo(
            new SingleToken('Fallback').fallbackOf(token),
          ),
        );
    const specialized = token.args('a').argsFn(() => ['b']);

    expect(
      specialized.resolve(withImplementations(createContainer({ name: 'blue', enabled: true })), { args: ['r'] }),
    ).toBe('r-a-b');
    expect(specialized.resolve(withImplementations(createContainer(OFF)), { args: ['r'] })).toBe('fallback r-a-b');
  });

  it('switches values as well as classes', () => {
    const token = new MultiVariantFeatureToken<number, 'high' | 'max'>('raise-limit');
    const withLimits = (c: Container) =>
      c
        .addRegistration(R.fromValue(10).bindTo(new SingleToken('DefaultLimit').fallbackOf(token)))
        .addRegistration(R.fromValue(50).bindTo(new SingleToken('RaisedLimit').primaryVariantOf(token)))
        .addRegistration(R.fromValue(100).bindTo(new SingleToken('HighLimit').variantOf(token, 'high')))
        .addRegistration(R.fromValue(1000).bindTo(new SingleToken('MaxLimit').variantOf(token, 'max')));

    expect(token.resolve(withLimits(createContainer(OFF)))).toBe(10);
    expect(token.resolve(withLimits(createContainer(OFF, true)))).toBe(50);
    expect(token.resolve(withLimits(createContainer({ name: 'high', enabled: true })))).toBe(100);
    expect(token.resolve(withLimits(createContainer({ name: 'max', enabled: true })))).toBe(1000);
  });

  it('narrows variantOf to the declared variant names', () => {
    const token = new MultiVariantFeatureToken<string, 'blue'>('flag');

    // @ts-expect-error 'red' is not a variant of this flag
    expect(() => new SingleToken<string>('Red').variantOf(token, 'red')).not.toThrow();
  });
});

describe('ToggleFeatureToken', () => {
  it('has no named variants, only a primary one', () => {
    const token = new ToggleFeatureToken<string>('flag');

    // @ts-expect-error a toggle has no named variants - use primaryVariantOf
    expect(() => new SingleToken<string>('On').variantOf(token, 'enabled')).not.toThrow();
  });

  it('asks isEnabled, not getVariant', () => {
    const flags = new Mock<IFeatureFlags>().setup((f) => f.isEnabled('flag', It.IsAny())).returns(true);
    const token = new ToggleFeatureToken<string>('flag');
    const container = new Container()
      .addRegistration(R.fromValue(flags.object()).bindTo(IFeatureFlagsToken))
      .addRegistration(R.fromValue({}).bindTo(IFeatureContextToken))
      .addRegistration(R.fromValue('off').bindTo(new SingleToken('Off').fallbackOf(token)))
      .addRegistration(R.fromValue('on').bindTo(new SingleToken('On').primaryVariantOf(token)));

    expect(token.resolve(container)).toBe('on');
  });
});

describe('BindableToken', () => {
  it('is the base of every token a registration can be bound to', () => {
    expect(new SingleToken('a')).toBeInstanceOf(BindableToken);
    expect(new SingleAliasToken('a')).toBeInstanceOf(BindableToken);
    expect(new GroupAliasToken('a')).toBeInstanceOf(BindableToken);
  });

  it('keeps the token kind, key and memberships across modifiers', () => {
    const feature = new ToggleFeatureToken<string>('flag');
    const token = new SingleAliasToken<string>('IAlias').primaryVariantOf(feature).args('x').lazy().addTags('t');

    expect(token).toBeInstanceOf(SingleAliasToken);
    expect(token.toString()).toBe('IAlias');

    const container = new Container()
      .addRegistration(
        R.fromValue({ isEnabled: () => true, getVariant: () => OFF } satisfies IFeatureFlags).bindTo(
          IFeatureFlagsToken,
        ),
      )
      .addRegistration(R.fromValue({}).bindTo(IFeatureContextToken))
      .addRegistration(R.fromValue('fallback').bindTo(new SingleToken('Fallback').fallbackOf(feature)))
      .addRegistration(R.fromValue('primary').bindToKey('Primary').bindTo(token));

    expect(feature.resolve(container)).toBe('primary');
  });

  it('declares memberships without changing the original token', () => {
    const feature = new ToggleFeatureToken<string>('flag');
    const token = new SingleToken<string>('Plain');
    token.fallbackOf(feature);

    const container = new Container().addRegistration(R.fromValue('plain').bindTo(token));

    expect(container.hasAlias(feature.fallbackAlias())).toBe(false);
  });
});
