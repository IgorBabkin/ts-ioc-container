import { IServiceLocator } from '../IServiceLocator';
import { IServiceLocatorStrategy } from './IServiceLocatorStrategy';
import { IStrategyFactory } from './IStrategyFactory';
import { IocServiceLocatorStrategy } from './ioc/IocServiceLocatorStrategy';
import { metadataCollector } from './ioc/decorators';

export class IocServiceLocatorStrategyFactory implements IStrategyFactory {
    create(l: IServiceLocator): IServiceLocatorStrategy {
        return new IocServiceLocatorStrategy(l, metadataCollector);
    }
}
