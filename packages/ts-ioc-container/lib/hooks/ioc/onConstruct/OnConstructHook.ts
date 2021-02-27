import { IHooksMetadataCollector } from '../IHooksMetadataCollector';
import { IInstanceHook } from '../../IInstanceHook';

export class OnConstructHook implements IInstanceHook {
    static HOOK_KEY = Symbol('ON_CONSTRUCT_HOOK_KEY');

    constructor(private metadata: IHooksMetadataCollector) {}

    onCreate(instance: unknown): void {
        if (!(instance instanceof Object)) {
            return;
        }
        for (const hookKey of this.metadata.getHookMethods(OnConstructHook.HOOK_KEY, instance)) {
            typeof instance[hookKey] === 'function' && instance[hookKey]();
        }
    }

    onDispose(): void {}
}
