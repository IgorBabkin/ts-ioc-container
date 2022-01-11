import { constructor } from '../../helpers/types';
import { IServiceLocator } from '../../core/IServiceLocator';
import { IInjector } from '../../core/IInjector';

export class SimpleInjector implements IInjector {
    resolve<T>(locator: IServiceLocator, value: constructor<T>, ...deps: any[]): T {
        return new value(locator, ...deps);
    }
}
