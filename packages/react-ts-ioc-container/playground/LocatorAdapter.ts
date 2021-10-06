import { IServiceLocator } from 'ts-ioc-container';
import { InjectionToken, Locator } from '../lib';
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
}
