import 'reflect-metadata';
import {
  ConstantToken,
  Container,
  ContainerDisposedError,
  ContainerError,
  DependencyMissingKeyError,
  DependencyNotFoundError,
  EmptyContainer,
  GroupInstanceToken,
  hook,
  MethodNotImplementedError,
  Provider,
  ProviderDisposedError,
  Registration as R,
  HookCollector,
  TypedEvent,
  TypedEventDisposedError,
  UnsupportedTokenTypeError,
} from '../../lib';
import { perform, runSync } from '../hooks/runners';
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

  it('rejects disposed typed event usage', () => {
    const event = new TypedEvent<[string]>();

    event.dispose();

    expect(() => event.subscribe(() => {})).toThrowError(TypedEventDisposedError);
    expect(() => event.emit('late')).toThrowError(TypedEventDisposedError);
    expect(new TypedEventDisposedError('x')).toBeInstanceOf(ContainerError);
  });

  it('rejects unsupported token operations', () => {
    expect(() => toToken({} as never)).toThrowError(UnsupportedTokenTypeError);
    expect(() => new ConstantToken('value').args('ignored')).toThrowError(MethodNotImplementedError);
    expect(() => new GroupInstanceToken(() => true).lazy()).toThrowError(MethodNotImplementedError);
  });

  it('routes what a hook threw to the caller’s error handler', () => {
    const failure = new Error('hook failed');

    class Worker {
      @hook('start', () => {
        throw failure;
      })
      start(): void {}
    }

    const container = new Container();
    const worker = container.resolve(Worker);
    const reported: unknown[] = [];

    perform(
      runSync(() => (ex) => reported.push(ex)),
      new HookCollector({ key: 'start' }),
    )(worker, {
      scope: container,
    });

    expect(reported).toEqual([failure]);
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
