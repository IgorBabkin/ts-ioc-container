import { IServiceLocator } from '../../../IServiceLocator';
import { Factory } from '../../../helpers/types';

export interface IInjectionItem<T> {
    resolve(locator: IServiceLocator): T | Factory<T>;
}
