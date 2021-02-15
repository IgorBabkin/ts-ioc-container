import { IHooksMetadataCollector } from './IHooksMetadataCollector';
import { IInstanceHook } from '../IInstanceHook';

export const ON_CONSTRUCT_HOOK_KEY = Symbol('ON_CONSTRUCT_HOOK_KEY');

export class OnConstructHook implements IInstanceHook {
    constructor(private metadata: IHooksMetadataCollector) {}

    public onCreateInstance(instance: any): void {
        if (!(instance instanceof Object)) {
            return;
        }
        for (const hookKey of this.metadata.getHookMethods(ON_CONSTRUCT_HOOK_KEY, instance)) {
            typeof instance[hookKey] === 'function' && instance[hookKey]();
        }
    }
}
