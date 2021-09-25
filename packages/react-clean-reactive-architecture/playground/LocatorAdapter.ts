import { IScopeContextKey, IServiceLocator, ProviderBuilder, ScopeContext } from 'ts-ioc-container';
import { InjectionToken, Locator } from '../lib';

export class LocatorAdapter implements Locator {
  constructor(private locator: IServiceLocator) {}

  createScope<T>(context?: T): Locator {
    const scope = this.locator.createLocator();
    if (context) {
      scope.register(IScopeContextKey, ProviderBuilder.fromConstructor(new ScopeContext(context)).asRequested());
    }
    return new LocatorAdapter(scope);
  }

  remove(): void {
    return this.locator.dispose();
  }

  resolve<T>(key: InjectionToken<T>, ...deps: unknown[]): T {
    return this.locator.resolve(key, ...deps);
  }
}
