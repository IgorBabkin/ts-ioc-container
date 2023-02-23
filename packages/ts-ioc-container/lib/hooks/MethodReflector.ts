import { IMethodReflector } from './IMethodReflector';

export class MethodReflector implements IMethodReflector {
    constructor(readonly hookKey: string | symbol) {}

    // eslint-disable-next-line @typescript-eslint/ban-types
    addHook<GInstance extends Object>(target: GInstance, propertyKey: string | symbol): void {
        const targetId = MethodReflector.getTargetId(target);
        const hooks = Reflect.getMetadata(this.hookKey, targetId) || [];
        Reflect.defineMetadata(this.hookKey, [...hooks, propertyKey], targetId);
    }

    // eslint-disable-next-line @typescript-eslint/ban-types
    invokeHooksOf<GInstance extends Object>(target: GInstance): void {
        const targetId = MethodReflector.getTargetId(target);
        const hooks: string[] = Reflect.hasMetadata(this.hookKey, targetId)
            ? Reflect.getMetadata(this.hookKey, targetId)
            : [];

        for (const hookMethod of hooks) {
            (target as any)[hookMethod]();
        }
    }

    // eslint-disable-next-line @typescript-eslint/ban-types
    private static getTargetId<GInstance extends Object = any>(target: GInstance): any {
        return target.constructor;
    }
}
