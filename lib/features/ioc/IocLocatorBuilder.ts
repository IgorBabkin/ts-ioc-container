import { IInjectMetadataCollector } from './IInjectMetadataCollector';
import { IocInjector } from './IocInjector';
import { LocatorBuilder } from '../LocatorBuilder';

export class IocLocatorBuilder extends LocatorBuilder {
    constructor(metadataCollector: IInjectMetadataCollector) {
        super((l) => new IocInjector(l, metadataCollector));
    }
}
