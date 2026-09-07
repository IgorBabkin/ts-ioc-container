import 'reflect-metadata';
import { Container, type IProxyRegistry, MetadataInjector, ProxyRegistry, Registration as R } from '../../lib';

describe('Injector proxy registry', () => {
  class Service {
    value = 1;
  }

  it('should use the singleton registry by default', () => {
    const container = new Container({ injector: new MetadataInjector() }).addRegistration(R.fromClass(Service));

    const lazyService = container.resolve(Service, { lazy: true });

    expect(lazyService.value).toBe(1);
    expect(ProxyRegistry.getInstance().unwrap(lazyService)).toBeInstanceOf(Service);
  });

  it('should use a substituted registry instead of the singleton', () => {
    const calls: boolean[] = [];
    const registry: IProxyRegistry = {
      unwrap: (value) => ProxyRegistry.getInstance().unwrap(value),
      createProxy: (target, handler) => ProxyRegistry.getInstance().createProxy(target, handler),
      createLazyProxy: (resolveInstance) => ProxyRegistry.getInstance().createLazyProxy(resolveInstance),
      toLazyIf: (resolveInstance, isLazy) => {
        calls.push(isLazy ?? false);
        return ProxyRegistry.getInstance().toLazyIf(resolveInstance, isLazy);
      },
    };

    const container = new Container({ injector: new MetadataInjector(registry) }).addRegistration(R.fromClass(Service));

    expect(container.resolve(Service, { lazy: true }).value).toBe(1);
    expect(calls).toEqual([true]);
  });
});
