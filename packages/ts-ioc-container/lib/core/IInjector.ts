import { constructor } from '../helpers/types';
import { IDisposable } from '../helpers/IDisposable';
import { IServiceLocator } from './IServiceLocator';

export interface IInjector extends IDisposable {
    resolve<T>(locator: IServiceLocator, value: constructor<T>, ...deps: any[]): T;

    clone(): IInjector;
}
