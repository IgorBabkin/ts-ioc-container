import 'reflect-metadata';

export const CONSTRUCTOR_METADATA_KEY = 'CONSTRUCTOR_METADATA_KEY';

export interface IMetadataCollector {
    // eslint-disable-next-line @typescript-eslint/ban-types
    setMetadata<T>(target: Object, key: string | symbol, value: T): void;

    // eslint-disable-next-line @typescript-eslint/ban-types
    getMetadata<T>(target: Object, key: string | symbol): T;
}

export class MetadataCollector implements IMetadataCollector {
    // eslint-disable-next-line @typescript-eslint/ban-types
    setMetadata<T>(target: Object, key: string | symbol, value: T): void {
        Reflect.defineMetadata(key, value, target);
    }

    // eslint-disable-next-line @typescript-eslint/ban-types
    getMetadata<T>(target: Object, key: string | symbol): T {
        return Reflect.getOwnMetadata(key, target);
    }
}