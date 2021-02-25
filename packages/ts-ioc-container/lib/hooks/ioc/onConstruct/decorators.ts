import { OnConstructHook } from './OnConstructHook';
import { IMethodDecorator } from '../../../helpers/IMethodDecorator';
import { hooksMetadataCollector } from '../HooksMetadataCollector';
import getPrototypeOf = Reflect.getPrototypeOf;

export const onConstruct: IMethodDecorator = (target, propertyKey) => {
    hooksMetadataCollector.addHookMethod(OnConstructHook.HOOK_KEY, getPrototypeOf(target), propertyKey);
};
