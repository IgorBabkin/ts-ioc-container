import { IServiceLocator } from '../IServiceLocator';
import { IServiceLocatorStrategy } from './IServiceLocatorStrategy';

export interface IStrategyFactory {
    create(locator: IServiceLocator): IServiceLocatorStrategy;
}
