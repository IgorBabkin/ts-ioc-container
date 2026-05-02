import 'reflect-metadata';
import {
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
  UnexpectedHookResultError,
  hook,
  HooksRunner,
} from '../../lib';
import { UnsupportedTokenTypeError } from '../../lib/errors/UnsupportedTokenTypeError';
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

  it('rejects unsupported token and hook operations', () => {
    class Worker {
      @hook('asyncOnly', async () => {})
      start(): void {}
    }

    const container = new Container();
    const worker = container.resolve(Worker);

    expect(() => toToken({} as never)).toThrowError(UnsupportedTokenTypeError);
    expect(() => new ConstantToken('value').args('ignored')).toThrowError(MethodNotImplementedError);
    expect(() => new GroupInstanceToken(() => true).lazy()).toThrowError(MethodNotImplementedError);
    expect(() => new HooksRunner('asyncOnly').execute(worker, { scope: container })).toThrowError(
      UnexpectedHookResultError,
    );
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
