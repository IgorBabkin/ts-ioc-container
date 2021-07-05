export interface IMethodsMetadataCollector {
    // eslint-disable-next-line @typescript-eslint/ban-types
    addHook(target: Object, propertyKey: string | symbol): void;

    invokeHooksOf<T>(instance: T): void;
}
