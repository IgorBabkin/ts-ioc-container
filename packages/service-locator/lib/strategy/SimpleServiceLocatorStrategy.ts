import { constructor, IServiceLocator } from '../IServiceLocator';
import { IServiceLocatorStrategy } from './IServiceLocatorStrategy';

export class SimpleServiceLocatorStrategy implements IServiceLocatorStrategy {
    constructor(private locator: IServiceLocator) {}

    public resolveConstructor<T>(value: constructor<T>, ...deps: any[]): T {
        return new value(this.locator, ...deps);
    }

    public setLocator(locator: IServiceLocator): IServiceLocator {
        return (this.locator = locator);
    }

    public dispose(): void {
        this.locator = undefined;
    }
}
