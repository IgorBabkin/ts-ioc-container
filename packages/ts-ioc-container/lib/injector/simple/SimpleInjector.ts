import { constructor } from '../../helpers/types';
import { IServiceLocator } from '../../IServiceLocator';
import { IInjector } from '../IInjector';

export class SimpleInjector implements IInjector {
    constructor(private locator: IServiceLocator) {}

    resolve<T>(value: constructor<T>, ...deps: any[]): T {
        return new value(this.locator, ...deps);
    }
}
