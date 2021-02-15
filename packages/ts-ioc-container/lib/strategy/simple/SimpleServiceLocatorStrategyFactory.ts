import { IServiceLocator } from '../../IServiceLocator';
import { IServiceLocatorStrategy } from '../IServiceLocatorStrategy';
import { IStrategyFactory } from '../IStrategyFactory';
import { SimpleServiceLocatorStrategy } from './SimpleServiceLocatorStrategy';

export class SimpleServiceLocatorStrategyFactory implements IStrategyFactory {
    create(l: IServiceLocator): IServiceLocatorStrategy {
        return new SimpleServiceLocatorStrategy(l);
    }
}
