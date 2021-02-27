import { IHooksMetadataCollector } from '../IHooksMetadataCollector';
import { IInstanceHook } from '../../IInstanceHook';

export class OnDisposeHook implements IInstanceHook {
    static HOOK_KEY = Symbol('ON_DISPOSE_HOOK_KEY');

    constructor(private metadata: IHooksMetadataCollector) {}

    onDispose(instance: unknown): void {
        if (!(instance instanceof Object)) {
            return;
        }
        for (const hookKey of this.metadata.getHookMethods(OnDisposeHook.HOOK_KEY, instance)) {
            typeof instance[hookKey] === 'function' && instance[hookKey]();
        }
    }

    onCreate(): void {}
}
