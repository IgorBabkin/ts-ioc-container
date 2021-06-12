import { IServiceLocator } from '../../../IServiceLocator';
import { IInjectionItem } from './IInjectionItem';
import { Factory } from '../../../helpers/types';

export class InstanceInjectionItem<T> implements IInjectionItem<T> {
    constructor(private value: T) {}

    resolve(locator: IServiceLocator): Factory<T> | T {
        return this.value;
    }
}
