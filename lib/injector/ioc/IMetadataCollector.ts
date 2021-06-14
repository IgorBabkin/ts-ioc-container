export interface IMetadataCollector {
    // eslint-disable-next-line @typescript-eslint/ban-types
    setMetadata<T>(target: Object, key: string | symbol, value: T): void;

    // eslint-disable-next-line @typescript-eslint/ban-types
    getMetadata<T>(target: Object, key: string | symbol): T;
}
