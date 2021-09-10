import { constructor } from '../../helpers/types';
import { IServiceLocator } from '../../core/IServiceLocator';
import { IInjector } from '../../core/IInjector';
import { constant, merge } from '../../helpers/helpers';
import { IInjectMetadataCollector } from './IInjectMetadataCollector';

export type IocServiceLocatorStrategyOptions = { simpleInjectionCompatible?: boolean };

export class IocInjector implements IInjector {
    constructor(
        private readonly metadataCollector: IInjectMetadataCollector,
        private readonly options: IocServiceLocatorStrategyOptions = {},
    ) {}

    resolve<T>(locator: IServiceLocator, value: constructor<T>, ...deps: any[]): T {
        const injectionFns = this.metadataCollector.getInjectionFns(value);
        const args = merge(injectionFns, deps.map(constant)).map((fn) => fn(locator));
        if (this.options.simpleInjectionCompatible) {
            args.push(locator);
        }
        return new value(...args);
    }

    dispose(): void {}
}
