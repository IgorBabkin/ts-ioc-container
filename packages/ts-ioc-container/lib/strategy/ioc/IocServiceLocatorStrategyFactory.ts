import { IServiceLocator } from '../../IServiceLocator';
import { IServiceLocatorStrategy } from '../IServiceLocatorStrategy';
import { IStrategyFactory } from '../IStrategyFactory';
import { IocServiceLocatorStrategy } from './IocServiceLocatorStrategy';
import { IInjectMetadataCollector } from './IInjectMetadataCollector';

export class IocServiceLocatorStrategyFactory implements IStrategyFactory {
    constructor(private metadataCollector: IInjectMetadataCollector) {}
    create(l: IServiceLocator): IServiceLocatorStrategy {
        return new IocServiceLocatorStrategy(l, this.metadataCollector);
    }
}
