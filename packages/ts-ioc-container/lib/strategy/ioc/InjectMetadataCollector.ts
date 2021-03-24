import 'reflect-metadata';

export const CONSTRUCTOR_INJECTION_METADATA_KEY = 'CONSTRUCTOR_INJECTION_METADATA_KEY';

export interface IInjectMetadataCollector {
    // eslint-disable-next-line @typescript-eslint/ban-types
    setMetadata<T>(target: Object, key: string | symbol, value: T): void;

    // eslint-disable-next-line @typescript-eslint/ban-types
    getMetadata<T>(target: Object, key: string | symbol): T;
}

export class InjectMetadataCollector implements IInjectMetadataCollector {
    // eslint-disable-next-line @typescript-eslint/ban-types
    setMetadata<T>(target: Object, key: string | symbol, value: T): void {
        Reflect.defineMetadata(key, value, target);
    }

    // eslint-disable-next-line @typescript-eslint/ban-types
    getMetadata<T>(target: Object, key: string | symbol): T {
        return Reflect.getOwnMetadata(key, target);
    }
}
