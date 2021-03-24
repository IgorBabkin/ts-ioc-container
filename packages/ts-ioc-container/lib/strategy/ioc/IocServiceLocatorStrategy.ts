import { constructor } from '../../helpers/types';
import { IServiceLocator } from '../../IServiceLocator';
import { IServiceLocatorStrategy } from '../IServiceLocatorStrategy';
import { CONSTRUCTOR_INJECTION_METADATA_KEY, IInjectMetadataCollector } from './InjectMetadataCollector';
import { IInjector, InstanceInjector } from './Injector';
import { merge } from '../../helpers/helpers';

export type IocServiceLocatorStrategyOptions = { simpleStrategyCompatible?: boolean };

export class IocServiceLocatorStrategy implements IServiceLocatorStrategy {
    constructor(
        private metadataCollector: IInjectMetadataCollector,
        private options: IocServiceLocatorStrategyOptions = {},
    ) {}

    resolveConstructor<T>(locator: IServiceLocator, value: constructor<T>, ...deps: any[]): T {
        const injectionItems = this.metadataCollector.getMetadata<IInjector<any>[]>(
            value,
            CONSTRUCTOR_INJECTION_METADATA_KEY,
        );
        return new value(
            ...merge(
                injectionItems,
                deps.map((d) => new InstanceInjector(d)),
            ).map((i) => i.resolve(locator)),
            this.options.simpleStrategyCompatible ? locator : undefined,
        );
    }
}
