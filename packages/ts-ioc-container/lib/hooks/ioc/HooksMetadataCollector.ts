import { HOOK_KEY, IHooksMetadataCollector } from './IHooksMetadataCollector';
import { Fn } from '../../helpers/types';

export class HooksMetadataCollector implements IHooksMetadataCollector {
    // eslint-disable-next-line @typescript-eslint/ban-types
    addHookMethod(hookKey: HOOK_KEY, target: object, propertyKey: string | symbol): void {
        const hooks = Reflect.getMetadata(hookKey, target) || [];
        Reflect.defineMetadata(hookKey, [...hooks, propertyKey], target);
    }

    // eslint-disable-next-line @typescript-eslint/ban-types
    getHookMethods(hookKey: HOOK_KEY, target: object): Fn[] {
        if (Reflect.hasMetadata(hookKey, target)) {
            return Reflect.getMetadata(hookKey, target);
        }
        const propertyKeys = Reflect.hasMetadata(hookKey, target) ? Reflect.getMetadata(hookKey, target) : [];
        return propertyKeys.map((propertyKey) => target[propertyKey]);
    }
}

export const hooksMetadataCollector = new HooksMetadataCollector();
