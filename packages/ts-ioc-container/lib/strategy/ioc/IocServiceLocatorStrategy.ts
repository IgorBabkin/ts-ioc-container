import { constructor } from '../../helpers/types';
import { IServiceLocator } from '../../IServiceLocator';
import { IServiceLocatorStrategy } from '../IServiceLocatorStrategy';
import { IInjectMetadataCollector } from './IInjectMetadataCollector';
import { InjectionItem } from './InjectMetadataCollector';

export type IocServiceLocatorStrategyOptions = { simpleStrategyCompatible?: boolean };

export class IocServiceLocatorStrategy implements IServiceLocatorStrategy {
    constructor(
        private metadataCollector: IInjectMetadataCollector,
        private options: IocServiceLocatorStrategyOptions = {},
    ) {}

    resolveConstructor<T>(locator: IServiceLocator, value: constructor<T>, ...deps: any[]): T {
        const injectionItems = this.metadataCollector.getMetadata(value);
        return new value(
            ...injectionItems.map((item) => this.resolveItem(locator, item)),
            ...deps,
            this.options.simpleStrategyCompatible ? locator : undefined,
        );
    }

    private resolveItem(locator: IServiceLocator, { token, type, argsFn }: InjectionItem<any>): any {
        switch (type) {
            case 'instance':
                return locator.resolve(token, ...argsFn(locator));

            case 'factory':
                return (...args2: any[]) => locator.resolve(token, ...argsFn(locator), ...args2);
        }
    }
}
