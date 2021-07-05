import { constructor } from '../helpers/types';
import { IServiceLocator } from './IServiceLocator';
import { IDisposable } from '../helpers/IDisposable';

export interface IInjector extends IDisposable {
    resolve<T>(locator: IServiceLocator, value: constructor<T>, ...deps: any[]): T;
}
