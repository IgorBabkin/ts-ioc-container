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
    const token = new MultiVariantFeatureToken('flag', { fallback: () => 'fallback' });

    expect(isInjectionToken(token)).toBe(true);
    expect(toToken(token)).toBe(token);
  });

  it('derives a stable key per variant, namespaced by the flag', () => {
    const token = new MultiVariantFeatureToken<unknown, 'blue'>('flag', { fallback: () => 'fallback' });

    expect(token.variant('blue').toString()).toBe('flag:blue');
    expect(token.args('x').lazy().variant('blue').toString()).toBe('flag:blue');
  });

  it('exposes the flag via toString()', () => {
    expect(new MultiVariantFeatureToken('flag', { fallback: () => 'fallback' }).toString()).toBe('flag');
  });

  it('keeps tags across modifiers without changing the original token', () => {
    const token = new MultiVariantFeatureToken('flag', { fallback: () => 'fallback' });
    const tagged = token.addTags('a').args(1).addTags('b');

    expect(tagged.hasTag('a')).toBe(true);
    expect(tagged.hasTag('b')).toBe(true);
    expect(token.hasTag('a')).toBe(false);
  });

  it('chains args and argsFn after runtime args in order, for variants and the fallback alike', () => {
    const token = new MultiVariantFeatureToken<string, 'blue'>('flag', {
      fallback: ({ args = [] }) => `fallback ${args.join('-')}`,
    });
    const withBlue = (c: Container) =>
      c.addRegistration(R.fromFn(({ args = [] }) => args.join('-')).bindTo(token.variant('blue')));
    const specialized = token.args('a').argsFn(() => ['b']);

    expect(specialized.resolve(withBlue(createContainer('blue')), { args: ['r'] })).toBe('r-a-b');
    expect(specialized.resolve(withBlue(createContainer(undefined)), { args: ['r'] })).toBe('fallback r-a-b');
  });

  it('switches values as well as classes', () => {
    const token = new MultiVariantFeatureToken<number, 'high' | 'max'>('raise-limit', { fallback: () => 10 });
    const withLimits = (c: Container) =>
      c
        .addRegistration(R.fromValue(100).bindTo(token.variant('high')))
        .addRegistration(R.fromValue(1000).bindTo(token.variant('max')));

    expect(token.resolve(withLimits(createContainer(undefined)))).toBe(10);
    expect(token.resolve(withLimits(createContainer('high')))).toBe(100);
    expect(token.resolve(withLimits(createContainer('max')))).toBe(1000);
  });
});

describe('ToggleFeatureToken', () => {
  it('binds the enabled implementation to the enabled variant', () => {
    const token = new ToggleFeatureToken('flag', { fallback: () => 'off' });

    expect(token.enabled().toString()).toBe('flag:enabled');
    expect(token.args('x').lazy().enabled().toString()).toBe('flag:enabled');
  });

  it('narrows the variants to enabled', () => {
    const token = new ToggleFeatureToken('flag', { fallback: () => 'off' });

    // @ts-expect-error a toggle serves only the enabled variant
    expect(token.variant('blue').toString()).toBe('flag:blue');
  });

  it('requires a fallback', () => {
    // @ts-expect-error a flag always has a fallback
    expect(() => new ToggleFeatureToken('flag', {})).not.toThrow();
  });

  it('asks isEnabled, not getVariant', () => {
    const flags = new Mock<IFeatureFlags>().setup((f) => f.isEnabled('flag', It.IsAny())).returns(true);
    const token = new ToggleFeatureToken<string>('flag', { fallback: () => 'off' });
    const container = new Container()
      .addRegistration(R.fromValue(flags.object()).bindTo(IFeatureFlagsToken))
      .addRegistration(R.fromValue({}).bindTo(IFeatureContextToken))
      .addRegistration(R.fromValue('on').bindTo(token.enabled()));

    expect(token.resolve(container)).toBe('on');
  });
});
