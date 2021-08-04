import 'reflect-metadata';
import { IInjectMetadataCollector } from '../../features/ioc/IInjectMetadataCollector';
import { InjectFn } from '../../features/ioc/InjectFn';

const CONSTRUCTOR_METADATA_KEY = Symbol('CONSTRUCTOR_METADATA_KEY');

export class InjectMetadataCollector implements IInjectMetadataCollector {
    // eslint-disable-next-line @typescript-eslint/ban-types
    addMetadata<T>(target: T, parameterIndex: number, injectionFn: InjectFn<any>): void {
        const metadata = this.getInjectionFns(target);
        metadata[parameterIndex] = injectionFn;
        Reflect.defineMetadata(CONSTRUCTOR_METADATA_KEY, metadata, target);
    }

    getInjectionFns<T>(target: T): InjectFn<any>[] {
        return Reflect.getOwnMetadata(CONSTRUCTOR_METADATA_KEY, target) ?? [];
    }
}
