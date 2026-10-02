import 'reflect-metadata';
import {
  ArgumentNotFoundError,
  CannonSingletonApplyTwiceError,
  CannotApplySingletonTwiceError,
  Container,
  ContainerDisposedError,
  ContainerError,
  ContainerNotFoundError,
  DependencyMissingKeyError,
  DependencyNotFoundError,
  EmptyContainer,
  findArgOrFail,
  MethodNotImplementedError,
  Provider,
  ProviderDisposedError,
  Registration as R,
  TypedEvent,
  TypedEventDisposedError,
  toToken,
  UnsupportedTokenTypeError,
} from '../lib';

/**
 * Error codes are the stable contract (messages may be reworded), and messages
 * say how to fix the problem - both are documented in the package's AGENTS.md.
 */
describe('errors', () => {
  it.each([
    [new ArgumentNotFoundError(), 'IOC_ARGUMENT_NOT_FOUND'],
    [new CannotApplySingletonTwiceError(), 'IOC_SINGLETON_APPLIED_TWICE'],
    [new ContainerDisposedError(''), 'IOC_CONTAINER_DISPOSED'],
    [new ContainerNotFoundError(''), 'IOC_CONTAINER_NOT_FOUND'],
    [new DependencyMissingKeyError(''), 'IOC_DEPENDENCY_MISSING_KEY'],
    [new DependencyNotFoundError(''), 'IOC_DEPENDENCY_NOT_FOUND'],
    [new MethodNotImplementedError(), 'IOC_METHOD_NOT_IMPLEMENTED'],
    [new ProviderDisposedError(''), 'IOC_PROVIDER_DISPOSED'],
    [new TypedEventDisposedError(''), 'IOC_EVENT_DISPOSED'],
    [new UnsupportedTokenTypeError(''), 'IOC_UNSUPPORTED_TOKEN_TYPE'],
  ])('%s carries code %s', (error: ContainerError, code: string) => {
    expect(error).toBeInstanceOf(ContainerError);
    expect(error.code).toBe(code);
  });

  it('keeps the misspelled CannonSingletonApplyTwiceError as an alias', () => {
    expect(CannonSingletonApplyTwiceError).toBe(CannotApplySingletonTwiceError);
    expect(() =>
      Provider.fromClass(class {})
        .singleton()
        .singleton(),
    ).toThrowError(CannonSingletonApplyTwiceError);
  });

  it('explains a missing dependency', () => {
    expect(() => new Container().resolve('Missing')).toThrowError(
      expect.objectContaining({
        code: 'IOC_DEPENDENCY_NOT_FOUND',
        message: expect.stringMatching(/Cannot find Missing: .*scope\(\.\.\.\).*createScope\(\)/),
      }),
    );
  });

  it('explains a missing alias', () => {
    expect(() => new Container().resolveOneByAlias('Alias')).toThrowError(/Cannot find alias Alias: /);
  });

  it('explains a registration without a key', () => {
    expect(() => new Container().addRegistration(R.fromValue(1))).toThrowError(/bindTo\(\.\.\.\)/);
  });

  it('explains a disposed container', () => {
    const container = new Container();
    container.dispose();

    expect(() => container.resolve('Any')).toThrowError(/Create a new scope/);
  });

  it('explains a disposed event', () => {
    const event = new TypedEvent<[]>();
    event.dispose();

    expect(() => event.subscribe(() => {})).toThrowError(/accepts no new listeners/);
  });

  it('explains an unsupported token', () => {
    expect(() => toToken(42 as never)).toThrowError(/Unknown token 42: expected an InjectionToken/);
  });

  it('explains an argument that matches nothing', () => {
    expect(() => findArgOrFail((arg) => arg === 'x')(['a', 'b'])).toThrowError(
      'No argument matches the predicate (received 2 args).',
    );
  });

  it('names the class and method that is not implemented', () => {
    expect(() => new EmptyContainer().createScope()).toThrowError('EmptyContainer.createScope is not implemented');
  });
});
