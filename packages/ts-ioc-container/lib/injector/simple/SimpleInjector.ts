import { constructor } from '../../helpers/types';
import { IServiceLocator } from '../../IServiceLocator';
import { IInjector } from '../IInjector';

export class SimpleInjector implements IInjector {
    resolveConstructor<T>(locator: IServiceLocator, value: constructor<T>, ...deps: any[]): T {
        return new value(locator, ...deps);
    }
}
