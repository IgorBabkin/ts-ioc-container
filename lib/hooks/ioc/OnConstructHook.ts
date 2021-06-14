import { IHooksMetadataCollector } from './IHooksMetadataCollector';
import { IInstanceHook } from '../IInstanceHook';

export class OnConstructHook implements IInstanceHook {
    static HOOK_KEY = Symbol('ON_CONSTRUCT_HOOK');

    constructor(private metadata: IHooksMetadataCollector) {}

    onCreate(instance: any): void {
        if (!(instance instanceof Object)) {
            return;
        }
        for (const method of this.metadata.getHookMethods(OnConstructHook.HOOK_KEY, instance)) {
            instance[method]();
        }
    }

    onDispose(): void {}
}
