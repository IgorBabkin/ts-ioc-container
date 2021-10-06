import { IServiceLocator } from 'ts-ioc-container';
import { InjectionToken } from '../lib';
import { Locator } from 'react-ts-ioc-container';

export class LocatorAdapter implements Locator {
    constructor(private locator: IServiceLocator) {}

    createScope(): Locator {
        return new LocatorAdapter(this.locator.createLocator());
    }

    remove(): void {
        return this.locator.dispose();
    }

    resolve<T>(key: InjectionToken<T>, ...deps: unknown[]): T {
        return this.locator.resolve(key, ...deps);
    }
}
