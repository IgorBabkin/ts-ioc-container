import { constructor } from '../helpers/types';
import { IServiceLocator } from './IServiceLocator';

export interface IInjector {
    resolve<T>(locator: IServiceLocator, value: constructor<T>, ...deps: any[]): T;
    dispose(): void;
}
