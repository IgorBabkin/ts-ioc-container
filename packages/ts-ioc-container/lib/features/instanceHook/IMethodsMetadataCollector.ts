export interface IMethodsMetadataCollector {
    // eslint-disable-next-line @typescript-eslint/ban-types
    addHook<GInstance extends Object>(target: GInstance, propertyKey: string | symbol): void;

    // eslint-disable-next-line @typescript-eslint/ban-types
    invokeHooksOf<GInstance extends Object>(target: GInstance): void;
}
