import { constructor } from '../helpers/types';
import { IServiceLocator } from '../IServiceLocator';

export interface IServiceLocatorStrategy {
    resolveConstructor<T>(locator: IServiceLocator, value: constructor<T>, ...deps: any[]): T;
}
