export class AsyncMethodReflector {
    constructor(readonly hookKey: string | symbol) {}

    // eslint-disable-next-line @typescript-eslint/ban-types
    private addHook(target: Object, propertyKey: string | symbol): void {
        const targetId = AsyncMethodReflector.getTargetId(target);
        const hooks = Reflect.getMetadata(this.hookKey, targetId) || [];
        Reflect.defineMetadata(this.hookKey, [...hooks, propertyKey], targetId);
    }

    // eslint-disable-next-line @typescript-eslint/ban-types
    async invokeHooksOf(target: Object, ...args: unknown[]): Promise<void> {
        const targetId = AsyncMethodReflector.getTargetId(target);
        const hooks: string[] = Reflect.hasMetadata(this.hookKey, targetId)
            ? Reflect.getMetadata(this.hookKey, targetId)
            : [];

        for (const hookMethod of hooks) {
            await (target as any)[hookMethod](...args);
        }
    }

    // eslint-disable-next-line @typescript-eslint/ban-types
    private static getTargetId(target: Object): any {
        return target.constructor;
    }

    createMethodHookDecorator(): MethodDecorator {
        return (target, propertyKey) => {
            // eslint-disable-next-line @typescript-eslint/ban-types
            this.addHook(target, propertyKey);
        };
    }
}
