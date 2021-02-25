import { IHooksMetadataCollector } from '../IHooksMetadataCollector';
import { IInstanceHook } from '../../IInstanceHook';

export class OnConstructHook implements IInstanceHook {
    public static HOOK_KEY = Symbol('ON_CONSTRUCT_HOOK_KEY');

    constructor(private metadata: IHooksMetadataCollector) {}

    public onCreate(instance: any): void {
        if (!(instance instanceof Object)) {
            return;
        }
        for (const hookKey of this.metadata.getHookMethods(OnConstructHook.HOOK_KEY, instance)) {
            typeof instance[hookKey] === 'function' && instance[hookKey]();
        }
    }
}
