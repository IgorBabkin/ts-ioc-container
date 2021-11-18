import { constructor } from '../../helpers/types';
import { IServiceLocator } from '../../core/IServiceLocator';
import { IInjector } from '../../core/IInjector';
import { constant, merge } from '../../helpers/utils';
import { IInjectMetadataCollector } from './IInjectMetadataCollector';

export class IocInjector implements IInjector {
    constructor(private readonly metadataCollector: IInjectMetadataCollector) {}

    resolve<T>(locator: IServiceLocator, value: constructor<T>, ...deps: any[]): T {
        const injectionFns = this.metadataCollector.getInjectionFns(value);
        const args = merge(injectionFns, deps.map(constant)).map((fn) => fn(locator));
        return new value(...args);
    }

    clone(): IInjector {
        return new IocInjector(this.metadataCollector);
    }

    dispose(): void {}
}
