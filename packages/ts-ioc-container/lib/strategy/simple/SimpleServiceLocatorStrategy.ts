import { constructor } from '../../helpers/types';
import { IServiceLocator } from '../../IServiceLocator';
import { IServiceLocatorStrategy } from '../IServiceLocatorStrategy';

export class SimpleServiceLocatorStrategy implements IServiceLocatorStrategy {
    resolveConstructor<T>(locator: IServiceLocator, value: constructor<T>, ...deps: any[]): T {
        return new value(locator, ...deps);
    }
}
