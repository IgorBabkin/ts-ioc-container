import { IHooksMetadataCollector } from './IHooksMetadataCollector';
import { IInstanceHook } from '../IInstanceHook';

export class OnDisposeHook implements IInstanceHook {
    static HOOK_KEY = Symbol('ON_DISPOSE_HOOK');

    constructor(private metadata: IHooksMetadataCollector) {}

    onDispose(instance: any): void {
        if (!(instance instanceof Object)) {
            return;
        }
        for (const method of this.metadata.getHookMethods(OnDisposeHook.HOOK_KEY, instance)) {
            instance[method]();
        }
    }

    onCreate(): void {}
}
