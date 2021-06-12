import { OnConstructHook } from '../../hooks/ioc/OnConstructHook';
import { OnDisposeHook } from '../../hooks/ioc/OnDisposeHook';
import { IHooksMetadataCollector } from '../../hooks/ioc/IHooksMetadataCollector';
import getPrototypeOf = Reflect.getPrototypeOf;

export function createOnConstructDecorator(collector: IHooksMetadataCollector): MethodDecorator {
    return (target, propertyKey) => {
        collector.addHookMethod(OnConstructHook.HOOK_KEY, getPrototypeOf(target), propertyKey);
    };
}

export function createOnDisposeDecorator(collector: IHooksMetadataCollector): MethodDecorator {
    return (target, propertyKey) => {
        collector.addHookMethod(OnDisposeHook.HOOK_KEY, getPrototypeOf(target), propertyKey);
    };
}
