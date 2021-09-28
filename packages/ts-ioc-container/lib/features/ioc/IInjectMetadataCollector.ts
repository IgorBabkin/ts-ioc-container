import { InjectFn } from './InjectFn';

export interface IInjectMetadataCollector {
    // eslint-disable-next-line @typescript-eslint/ban-types
    addMetadata<T>(target: T, parameterIndex: number, injectionFn: InjectFn<any>): void;
    getInjectionFns<T>(target: T): InjectFn<any>[];
}
