import { HOOK_KEY, IHooksMetadataCollector } from '../../hooks/ioc/IHooksMetadataCollector';

export class HooksMetadataCollector implements IHooksMetadataCollector {
    // eslint-disable-next-line @typescript-eslint/ban-types
    addHookMethod(hookKey: HOOK_KEY, target: object, propertyKey: string | symbol): void {
        const hooks = Reflect.getMetadata(hookKey, target) || [];
        Reflect.defineMetadata(hookKey, [...hooks, propertyKey], target);
    }

    // eslint-disable-next-line @typescript-eslint/ban-types
    getHookMethods(hookKey: HOOK_KEY, target: object): string[] {
        return Reflect.hasMetadata(hookKey, target) ? Reflect.getMetadata(hookKey, target) : [];
    }
}
