import { constructor } from '../../helpers/types';
import { IContainer } from '../../core/IContainer';
import { IInjector } from '../../core/IInjector';

export class SimpleInjector implements IInjector {
    resolve<T>(locator: IContainer, value: constructor<T>, ...deps: any[]): T {
        return new value(locator, ...deps);
    }
}
