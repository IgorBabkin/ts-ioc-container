import { IServiceLocator } from '../../IServiceLocator';
import { IInjector } from '../IInjector';
import { IInjectorFactory } from '../IInjectorFactory';
import { IocInjector, IocServiceLocatorStrategyOptions } from './IocInjector';
import { IMetadataCollector } from './MetadataCollector';

export class IocInjectorFactory implements IInjectorFactory {
    constructor(private metadataCollector: IMetadataCollector, private options?: IocServiceLocatorStrategyOptions) {}

    create(locator: IServiceLocator): IInjector {
        return new IocInjector(locator, this.metadataCollector, this.options);
    }
}
