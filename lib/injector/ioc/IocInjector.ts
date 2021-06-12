import { constructor } from '../../helpers/types';
import { IServiceLocator } from '../../IServiceLocator';
import { IInjector } from '../IInjector';
import { CONSTRUCTOR_METADATA_KEY } from '../../infrastructure/injector/MetadataCollector';
import { merge } from '../../helpers/helpers';
import { InstanceInjectionItem } from './item/InstanceInjectionItem';
import { IInjectionItem } from './item/IInjectionItem';
import { IMetadataCollector } from './IMetadataCollector';

export type IocServiceLocatorStrategyOptions = { simpleInjectionCompatible?: boolean };

export class IocInjector implements IInjector {
    constructor(
        private locator: IServiceLocator,
        private metadataCollector: IMetadataCollector,
        private options: IocServiceLocatorStrategyOptions = {},
    ) {}

    resolve<T>(value: constructor<T>, ...deps: any[]): T {
        const injectionItems =
            this.metadataCollector.getMetadata<IInjectionItem<any>[]>(value, CONSTRUCTOR_METADATA_KEY) || [];
        return new value(
            ...merge(
                injectionItems,
                deps.map((d) => new InstanceInjectionItem(d)),
            ).map((i) => i.resolve(this.locator)),
            this.options.simpleInjectionCompatible ? this.locator : undefined,
        );
    }
}
