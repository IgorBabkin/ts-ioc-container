import 'reflect-metadata';
import {
  append,
  ConstantToken,
  Container,
  ContainerDisposedError,
  DependencyMissingKeyError,
  DependencyNotFoundError,
  EmptyContainer,
  GroupInstanceToken,
  MethodNotImplementedError,
  Provider,
  ProviderDisposedError,
  Registration as R,
  UnsupportedTokenTypeError,
  ContainerError,
  hook,
  HooksRunner,
} from '../../lib';
import { toToken } from '../../lib/token/toToken';

describe('Spec: errors and boundaries', () => {
  it('fails clearly for missing dependencies', () => {
    const container = new Container();

    expect(() => container.resolve('MissingService')).toThrowError(DependencyNotFoundError);
    expect(() => container.resolveOneByAlias('MissingAlias')).toThrowError(DependencyNotFoundError);
  });

  it('fails clearly for invalid registrations', () => {
    const registration = R.fromValue('missing-key');

    expect(() => registration.getKeyOrFail()).toThrowError(DependencyMissingKeyError);
    expect(() => new Container().addRegistration(registration)).toThrowError(DependencyMissingKeyError);
  });

  it('rejects disposed container usage', () => {
    const container = new Container().addRegistration(R.fromValue('ready').bindToKey('Status'));

    container.dispose();

    expect(() => container.resolve('Status')).toThrowError(ContainerDisposedError);
    expect(() => container.register('Other', Provider.fromValue('other'))).toThrowError(ContainerDisposedError);
    expect(() => container.createScope()).toThrowError(ContainerDisposedError);
  });

  it('rejects disposed provider usage', () => {
    const provider = Provider.fromValue('ready');
    const container = new Container();

    provider.dispose();

    expect(() => provider.resolve(container, {})).toThrowError(ProviderDisposedError);
    expect(() => provider.hasAccess({ invocationScope: container, providerScope: container, args: [] })).toThrowError(
      ProviderDisposedError,
    );
  });

  it('rejects unsupported token operations', () => {
    expect(() => toToken({} as never)).toThrowError(UnsupportedTokenTypeError);
    expect(() => new ConstantToken('value').args('ignored')).toThrowError(MethodNotImplementedError);
    expect(() => new GroupInstanceToken(() => true).lazy()).toThrowError(MethodNotImplementedError);
  });

  it('surfaces what a hook threw out of the runner', () => {
    const failure = new Error('hook failed');

    class Worker {
      @hook(
        'start',
        append(() => {
          throw failure;
        }),
      )
      start(): void {}
    }

    const container = new Container();
    const worker = container.resolve(Worker);

    expect(() => new HooksRunner('start').execute(worker, { scope: container })).toThrowError(failure);
  });

  it('lets a single catch block handle every container error', () => {
    const container = new Container();

    expect(() => container.resolve('MissingService')).toThrowError(ContainerError);
    expect(() => toToken({} as never)).toThrowError(ContainerError);
    expect(() => new ConstantToken('value').args('ignored')).toThrowError(ContainerError);
  });

  it('terminates parent lookup at the empty container boundary', () => {
    const empty = new EmptyContainer();

    expect(empty.getParent()).toBeUndefined();
    expect(empty.getScopes()).toEqual([]);
    expect(empty.getRegistrations()).toEqual([]);
    expect(empty.getInstances()).toEqual([]);
    expect(() => empty.resolve('MissingService')).toThrowError(DependencyNotFoundError);
    expect(() => empty.createScope()).toThrowError(MethodNotImplementedError);
  });
});
