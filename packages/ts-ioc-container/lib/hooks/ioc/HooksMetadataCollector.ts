import { HOOK_KEY, IHooksMetadataCollector } from './IHooksMetadataCollector';

export class HooksMetadataCollector implements IHooksMetadataCollector {
    // eslint-disable-next-line @typescript-eslint/ban-types
    addHookMethod(hookKey: HOOK_KEY, target: object, propertyKey: string | symbol): void {
        const hooks = Reflect.getMetadata(hookKey, target) || [];
        Reflect.defineMetadata(hookKey, [...hooks, propertyKey], target);
    }

    // eslint-disable-next-line @typescript-eslint/ban-types
    getHookMethods(hookKey: HOOK_KEY, target: object): string[] {
        if (Reflect.hasMetadata(hookKey, target)) {
            return Reflect.getMetadata(hookKey, target);
        }
        return Reflect.hasMetadata(hookKey, target) ? Reflect.getMetadata(hookKey, target) : [];
    }
}

export const hooksMetadataCollector = new HooksMetadataCollector();
