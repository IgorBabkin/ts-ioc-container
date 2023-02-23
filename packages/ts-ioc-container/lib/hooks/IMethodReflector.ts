export interface IMethodReflector {
    // eslint-disable-next-line @typescript-eslint/ban-types
    addHook<GInstance extends Object>(target: GInstance, propertyKey: string | symbol): void;

    // eslint-disable-next-line @typescript-eslint/ban-types
    invokeHooksOf<GInstance extends Object>(target: GInstance): void;
}

export function createMethodHookDecorator(metadata: IMethodReflector): MethodDecorator {
    return (target, propertyKey) => {
        // eslint-disable-next-line @typescript-eslint/ban-types
        metadata.addHook(target, propertyKey);
    };
}
