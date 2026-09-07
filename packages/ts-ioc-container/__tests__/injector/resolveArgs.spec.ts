import 'reflect-metadata';
import { Container, inject, ProxyRegistry, resolveArgs, Registration as R, SingleToken } from '../../lib';

const GreetingToken = new SingleToken<string>('greeting');

class Service {
  constructor(@inject(GreetingToken) public greeting: string) {}

  greet(@inject(GreetingToken) other?: string) {
    return other;
  }
}

describe('resolveArgs', () => {
  function createContainer() {
    return new Container().addRegistration(R.fromValue('hello').bindTo(GreetingToken));
  }

  it('accepts the constructor', () => {
    const scope = createContainer();

    expect(resolveArgs(Service)(scope, {})).toEqual(['hello']);
  });

  it('accepts an instance of that constructor', () => {
    const scope = createContainer();
    const instance = scope.resolve(Service);

    expect(resolveArgs(instance)(scope, {})).toEqual(['hello']);
  });

  it('accepts a proxy of the constructor, unwrapping it to reach the metadata', () => {
    const scope = createContainer();
    // A proxied class stands in for the class itself, which is the key metadata is
    // read from - the one case that has to be unwrapped rather than read through.
    const ProxiedService = ProxyRegistry.getInstance().createProxy(Service, {});

    expect(resolveArgs(ProxiedService)(scope, {})).toEqual(['hello']);
  });

  it('accepts a proxy of an instance', () => {
    const scope = createContainer();
    const proxy = ProxyRegistry.getInstance().createProxy(scope.resolve(Service), {});

    expect(resolveArgs(proxy)(scope, {})).toEqual(['hello']);
  });

  it('accepts a lazy proxy, unwrapping it before reading metadata', () => {
    const scope = createContainer();
    const lazy = ProxyRegistry.getInstance().createLazyProxy(() => scope.resolve(Service));

    expect(resolveArgs(lazy)(scope, {})).toEqual(['hello']);
  });

  it('reads method metadata from any of them', () => {
    const scope = createContainer();
    const instance = scope.resolve(Service);
    const lazy = ProxyRegistry.getInstance().createLazyProxy(() => instance);

    expect(resolveArgs(Service, 'greet')(scope, {})).toEqual(['hello']);
    expect(resolveArgs(instance, 'greet')(scope, {})).toEqual(['hello']);
    expect(resolveArgs(lazy, 'greet')(scope, {})).toEqual(['hello']);
  });
});
