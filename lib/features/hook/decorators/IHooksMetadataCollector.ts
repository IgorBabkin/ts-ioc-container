export type HOOK_KEY = string | symbol;

export interface IHooksMetadataCollector {
    // eslint-disable-next-line @typescript-eslint/ban-types
    addHook(target: Object, propertyKey: string | symbol): void;

    invokeHooksOf<T>(instance: T): void;
}
