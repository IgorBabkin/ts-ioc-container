import { HOOK_KEY, IHooksMetadataCollector } from './IHooksMetadataCollector';
import getPrototypeOf = Reflect.getPrototypeOf;

export class MethodsMetadataCollector implements IHooksMetadataCollector {
    constructor(readonly hookKey: HOOK_KEY) {}

    // eslint-disable-next-line @typescript-eslint/ban-types
    addHook<GInstance extends Object>(target: GInstance, propertyKey: string | symbol): void {
        const proto = getPrototypeOf(target);
        if (proto === null) {
            throw new Error('cannot find proto');
        }
        (proto as any).iii = '12';
        const hooks = Reflect.getMetadata(this.hookKey, proto) || [];
        Reflect.defineMetadata(this.hookKey, [...hooks, propertyKey], proto);
    }

    // eslint-disable-next-line @typescript-eslint/ban-types
    invokeHooksOf<T extends Object>(target: T): void {
        const hooks: string[] = Reflect.hasMetadata(this.hookKey, target)
            ? Reflect.getMetadata(this.hookKey, target)
            : [];

        for (const hookMethod of hooks) {
            (target as any)[hookMethod]();
        }
    }
}
