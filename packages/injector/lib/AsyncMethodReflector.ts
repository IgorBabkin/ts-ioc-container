export class AsyncMethodReflector {
    constructor(readonly hookKey: string | symbol) {}

    // eslint-disable-next-line @typescript-eslint/ban-types
    private addHook<GInstance extends Object>(target: GInstance, propertyKey: string | symbol): void {
        const targetId = AsyncMethodReflector.getTargetId(target);
        const hooks = Reflect.getMetadata(this.hookKey, targetId) || [];
        Reflect.defineMetadata(this.hookKey, [...hooks, propertyKey], targetId);
    }

    // eslint-disable-next-line @typescript-eslint/ban-types
    async invokeHooksOf<GInstance extends Object>(target: GInstance): Promise<void> {
        const targetId = AsyncMethodReflector.getTargetId(target);
        const hooks: string[] = Reflect.hasMetadata(this.hookKey, targetId)
            ? Reflect.getMetadata(this.hookKey, targetId)
            : [];

        for (const hookMethod of hooks) {
            await (target as any)[hookMethod]();
        }
    }

    // eslint-disable-next-line @typescript-eslint/ban-types
    private static getTargetId<GInstance extends Object = any>(target: GInstance): any {
        return target.constructor;
    }

    createMethodHookDecorator(): MethodDecorator {
        return (target, propertyKey) => {
            // eslint-disable-next-line @typescript-eslint/ban-types
            this.addHook(target, propertyKey);
        };
    }
}
