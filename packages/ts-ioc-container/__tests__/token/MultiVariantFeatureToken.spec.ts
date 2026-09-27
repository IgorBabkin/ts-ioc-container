import { It, Mock } from 'moq.ts';
import {
  Container,
  type IFeatureFlags,
  IFeatureContextToken,
  IFeatureFlagsToken,
  isInjectionToken,
  MultiVariantFeatureToken,
  Registration as R,
  ToggleFeatureToken,
  toToken,
} from '../../lib';

describe('MultiVariantFeatureToken', () => {
  const createContainer = (variant: string | undefined) =>
    new Container()
      .addRegistration(
        R.fromValue(
          new Mock<IFeatureFlags>()
            .setup((f) => f.getVariant(It.IsAny(), It.IsAny()))
            .returns({ name: variant ?? 'disabled', enabled: variant !== undefined })
            .object(),
        ).bindTo(IFeatureFlagsToken),
      )
      .addRegistration(R.fromValue({}).bindTo(IFeatureContextToken));

  it('is an injection token that toToken passes through', () => {
    const token = new MultiVariantFeatureToken('IService', 'flag');

    expect(isInjectionToken(token)).toBe(true);
    expect(toToken(token)).toBe(token);
  });

  it('derives a stable key per variant', () => {
    const token = new MultiVariantFeatureToken<unknown, 'blue'>('IService', 'flag');

    expect(token.variant('blue').toString()).toBe('IService@flag:blue');
    expect(token.args('x').lazy().variant('blue').toString()).toBe('IService@flag:blue');
  });

  it('exposes the fallback key via toString()', () => {
    expect(new MultiVariantFeatureToken('IService', 'flag').toString()).toBe('IService');
  });

  it('keeps tags across modifiers without changing the original token', () => {
    const token = new MultiVariantFeatureToken('IService', 'flag');
    const tagged = token.addTags('a').args(1).addTags('b');

    expect(tagged.hasTag('a')).toBe(true);
    expect(tagged.hasTag('b')).toBe(true);
    expect(token.hasTag('a')).toBe(false);
  });

  it('chains args and argsFn after runtime args in order', () => {
    const token = new MultiVariantFeatureToken<string, 'blue'>('IService', 'flag');
    const container = createContainer('blue').addRegistration(
      R.fromFn(({ args = [] }) => args.join('-')).bindTo(token.variant('blue')),
    );

    expect(
      token
        .args('a')
        .argsFn(() => ['b'])
        .resolve(container, { args: ['r'] }),
    ).toBe('r-a-b');
  });

  it('switches values as well as classes', () => {
    const token = new MultiVariantFeatureToken<number, 'high' | 'max'>('Limit', 'raise-limit');
    const withLimits = (c: Container) =>
      c
        .addRegistration(R.fromValue(10).bindTo(token))
        .addRegistration(R.fromValue(100).bindTo(token.variant('high')))
        .addRegistration(R.fromValue(1000).bindTo(token.variant('max')));

    expect(token.resolve(withLimits(createContainer(undefined)))).toBe(10);
    expect(token.resolve(withLimits(createContainer('high')))).toBe(100);
    expect(token.resolve(withLimits(createContainer('max')))).toBe(1000);
  });
});

describe('ToggleFeatureToken', () => {
  it('binds the enabled implementation to the enabled variant', () => {
    const token = new ToggleFeatureToken('IService', 'flag');

    expect(token.enabled().toString()).toBe('IService@flag:enabled');
    expect(token.args('x').lazy().enabled().toString()).toBe('IService@flag:enabled');
  });

  it('narrows the variants to enabled', () => {
    const token = new ToggleFeatureToken('IService', 'flag');

    // @ts-expect-error a toggle serves only the enabled variant
    expect(token.variant('blue').toString()).toBe('IService@flag:blue');
  });

  it('asks isEnabled, not getVariant', () => {
    const flags = new Mock<IFeatureFlags>().setup((f) => f.isEnabled('flag', It.IsAny())).returns(true);
    const token = new ToggleFeatureToken<string>('IService', 'flag');
    const container = new Container()
      .addRegistration(R.fromValue(flags.object()).bindTo(IFeatureFlagsToken))
      .addRegistration(R.fromValue({}).bindTo(IFeatureContextToken))
      .addRegistration(R.fromValue('off').bindTo(token))
      .addRegistration(R.fromValue('on').bindTo(token.enabled()));

    expect(token.resolve(container)).toBe('on');
  });
});
