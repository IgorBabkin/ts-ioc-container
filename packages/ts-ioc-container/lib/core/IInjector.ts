import { constructor, IDisposable } from '../helpers/types';
import { IServiceLocator } from './IServiceLocator';

export interface IInjector extends IDisposable {
    resolve<T>(locator: IServiceLocator, value: constructor<T>, ...deps: any[]): T;

    clone(): IInjector;
}
