import { IServiceLocator, ProviderBuilder } from 'ts-ioc-container';
import { InjectionToken, Locator, ProviderKey } from '../lib';
import { LocatorOptions } from '../lib/locator';

export class LocatorAdapter implements Locator {
    constructor(private locator: IServiceLocator) {}

    createScope({ tags }: LocatorOptions): Locator {
        return new LocatorAdapter(this.locator.createLocator(tags));
    }

    remove(): void {
        return this.locator.dispose();
    }

    resolve<T>(key: InjectionToken<T>, ...deps: unknown[]): T {
        return this.locator.resolve(key, ...deps);
    }

    register<T>(token: ProviderKey, value: T): this {
        this.locator.register(token, ProviderBuilder.fromInstance(value).build());
        return this;
    }
}
