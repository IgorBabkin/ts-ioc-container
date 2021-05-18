import { IServiceLocator } from '../IServiceLocator';
import { IInjector } from './IInjector';

export interface IInjectorFactory {
    create(locator: IServiceLocator): IInjector;
}
