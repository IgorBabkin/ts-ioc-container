import { constructor } from '../../helpers/types';
import { IServiceLocator } from '../../IServiceLocator';
import { IInjector } from '../IInjector';
import { CONSTRUCTOR_METADATA_KEY, IMetadataCollector } from './MetadataCollector';
import { IInjectionItem, InstanceInjectionItem } from './InjectionItem';
import { merge } from '../../helpers/helpers';

export type IocServiceLocatorStrategyOptions = { simpleInjectionCompatible?: boolean };

export class IocInjector implements IInjector {
    constructor(
        private metadataCollector: IMetadataCollector,
        private options: IocServiceLocatorStrategyOptions = {},
    ) {}

    resolveConstructor<T>(locator: IServiceLocator, value: constructor<T>, ...deps: any[]): T {
        const injectionItems =
            this.metadataCollector.getMetadata<IInjectionItem<any>[]>(value, CONSTRUCTOR_METADATA_KEY) || [];
        return new value(
            ...merge(
                injectionItems,
                deps.map((d) => new InstanceInjectionItem(d)),
            ).map((i) => i.resolve(locator)),
            this.options.simpleInjectionCompatible ? locator : undefined,
        );
    }
}
