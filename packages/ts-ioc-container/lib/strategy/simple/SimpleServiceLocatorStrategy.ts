import { constructor } from '../../helpers/types';
import { IServiceLocator } from '../../IServiceLocator';
import { IServiceLocatorStrategy } from '../IServiceLocatorStrategy';

export class SimpleServiceLocatorStrategy implements IServiceLocatorStrategy {
    private locator: IServiceLocator;

    public resolveConstructor<T>(value: constructor<T>, ...deps: any[]): T {
        return new value(this.locator, ...deps);
    }

    public dispose(): void {
        this.locator = undefined;
    }

    bindTo(locator: IServiceLocator): void {
        this.locator = locator;
    }

    clone(): IServiceLocatorStrategy {
        return new SimpleServiceLocatorStrategy();
    }
}
