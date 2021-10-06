import { IScopeContextKey, IServiceLocator, ProviderBuilder } from 'ts-ioc-container';
import { InjectionToken, Locator } from '../lib';
import { LocatorOptions } from '../lib/locator';

export class LocatorAdapter implements Locator {
    constructor(private locator: IServiceLocator) {}

    createScope<T>({ tags, context }: LocatorOptions<T>): Locator {
        const scope = this.locator.createLocator(tags);
        if (context) {
            scope.register(IScopeContextKey, ProviderBuilder.fromInstance(context).build());
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
