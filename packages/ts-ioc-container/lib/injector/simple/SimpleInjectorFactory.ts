import { IServiceLocator } from '../../IServiceLocator';
import { IInjector } from '../IInjector';
import { IInjectorFactory } from '../IInjectorFactory';
import { SimpleInjector } from './SimpleInjector';

export class SimpleInjectorFactory implements IInjectorFactory {
    create(locator: IServiceLocator): IInjector {
        return new SimpleInjector(locator);
    }
}
