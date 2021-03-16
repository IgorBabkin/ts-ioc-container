import { OnConstructHook } from './OnConstructHook';
import { hooksMetadataCollector } from '../HooksMetadataCollector';
import getPrototypeOf = Reflect.getPrototypeOf;

export const onConstruct: MethodDecorator = (target, propertyKey) => {
    hooksMetadataCollector.addHookMethod(OnConstructHook.HOOK_KEY, getPrototypeOf(target), propertyKey);
};
