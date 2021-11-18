import 'reflect-metadata';
import { IInjectMetadataCollector } from './IInjectMetadataCollector';
import { InjectFn } from './InjectFn';

export class InjectMetadataCollector implements IInjectMetadataCollector {
    constructor(private readonly metadataKey: string | symbol) {}

    // eslint-disable-next-line @typescript-eslint/ban-types
    addMetadata<T>(target: T, parameterIndex: number, injectionFn: InjectFn<any>): void {
        const metadata = this.getInjectionFns(target);
        metadata[parameterIndex] = injectionFn;
        Reflect.defineMetadata(this.metadataKey, metadata, target);
    }

    getInjectionFns<T>(target: T): InjectFn<any>[] {
        return Reflect.getOwnMetadata(this.metadataKey, target) ?? [];
    }
}
