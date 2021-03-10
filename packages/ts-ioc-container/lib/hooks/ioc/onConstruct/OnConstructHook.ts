import { IHooksMetadataCollector } from '../IHooksMetadataCollector';
import { IInstanceHook } from '../../IInstanceHook';
import { Fn } from '../../../helpers/types';

export class OnConstructHook implements IInstanceHook {
    static HOOK_KEY = Symbol('ON_CONSTRUCT_HOOK_KEY');

    constructor(private metadata: IHooksMetadataCollector) {}

    onCreate(instance: unknown): void {
        if (!(instance instanceof Object)) {
            return;
        }
        for (const method of this.metadata.getHookMethods(OnConstructHook.HOOK_KEY, instance)) {
            method();
        }
    }

    onDispose(): void {}
}
