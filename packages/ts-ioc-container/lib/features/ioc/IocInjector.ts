import { constructor } from '../../helpers/types';
import { IServiceLocator } from '../../core/IServiceLocator';
import { IInjector } from '../../core/IInjector';
import { constant, merge } from '../../helpers/helpers';
import { IInjectMetadataCollector } from './IInjectMetadataCollector';

export class IocInjector implements IInjector {
    constructor(
        private readonly locator: IServiceLocator,
        private readonly metadataCollector: IInjectMetadataCollector,
    ) {}

    resolve<T>(value: constructor<T>, ...deps: any[]): T {
        const injectionFns = this.metadataCollector.getInjectionFns(value);
        const args = merge(injectionFns, deps.map(constant)).map((fn) => fn(this.locator));
        return new value(...args);
    }

    dispose(): void {}
}
