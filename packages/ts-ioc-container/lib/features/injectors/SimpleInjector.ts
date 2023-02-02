import { constructor } from '../../helpers/types';
import { IContainer } from '../../core/IContainer';
import { IInjector } from '../../core/IInjector';

export class SimpleInjector implements IInjector {
    resolve<T>(container: IContainer, value: constructor<T>, ...deps: any[]): T {
        return new value(container, ...deps);
    }
}
