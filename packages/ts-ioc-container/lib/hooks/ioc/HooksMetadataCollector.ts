import { HOOK_KEY, IHooksMetadataCollector } from './IHooksMetadataCollector';

export class HooksMetadataCollector implements IHooksMetadataCollector {
    // eslint-disable-next-line @typescript-eslint/ban-types
    public addHookMethod(hookKey: HOOK_KEY, target: object, propertyKey: string): void {
        const hooks = Reflect.getMetadata(hookKey, target) || [];
        Reflect.defineMetadata(hookKey, [...hooks, propertyKey], target);
    }

    // eslint-disable-next-line @typescript-eslint/ban-types
    public getHookMethods(hookKey: HOOK_KEY, target: object): string[] {
        if (Reflect.hasMetadata(hookKey, target)) {
            return Reflect.getMetadata(hookKey, target);
        }
        return Reflect.hasMetadata(hookKey, target) ? Reflect.getMetadata(hookKey, target) : [];
    }
}

export const hooksMetadataCollector = new HooksMetadataCollector();
