import { constructor } from '../../helpers/types';
import { IServiceLocator } from '../../core/IServiceLocator';
import { IInjector } from '../../core/IInjector';
import { constant, merge } from '../../helpers/helpers';
import { IInjectMetadataCollector } from './IInjectMetadataCollector';

export class IocInjector implements IInjector {
    constructor(private readonly metadataCollector: IInjectMetadataCollector) {}

    resolve<T>(locator: IServiceLocator, value: constructor<T>, ...deps: any[]): T {
        return new value(
            ...merge(this.metadataCollector.getInjectionFns(value), deps.map(constant)).map((fn) => fn(locator)),
        );
    }

    dispose(): void {}
}
