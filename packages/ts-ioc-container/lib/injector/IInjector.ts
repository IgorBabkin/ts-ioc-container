import { constructor } from '../helpers/types';
import { IServiceLocator } from '../IServiceLocator';

export interface IInjector {
    resolveConstructor<T>(locator: IServiceLocator, value: constructor<T>, ...deps: any[]): T;
}
