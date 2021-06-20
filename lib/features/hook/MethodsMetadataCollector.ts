import { IMethodsMetadataCollector } from './IMethodsMetadataCollector';

export class MethodsMetadataCollector implements IMethodsMetadataCollector {
    constructor(readonly hookKey: string | symbol) {}

    // eslint-disable-next-line @typescript-eslint/ban-types
    addHook<GInstance extends Object>(target: GInstance, propertyKey: string | symbol): void {
        const targetId = MethodsMetadataCollector.getTargetId(target);
        if (targetId === null) {
            throw new Error('cannot find proto');
        }
        const hooks = Reflect.getMetadata(this.hookKey, targetId) || [];
        Reflect.defineMetadata(this.hookKey, [...hooks, propertyKey], targetId);
    }

    // eslint-disable-next-line @typescript-eslint/ban-types
    invokeHooksOf<T extends Object>(target: T): void {
        const targetId = MethodsMetadataCollector.getTargetId(target);
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
