import { constructor } from '../core/utils/types';
import { IContainer } from '../core/container/IContainer';
import { IInjector } from '../core/IInjector';

export class SimpleInjector implements IInjector {
    resolve<T>(container: IContainer, value: constructor<T>, ...deps: any[]): T {
        return new value(container, ...deps);
    }
}
