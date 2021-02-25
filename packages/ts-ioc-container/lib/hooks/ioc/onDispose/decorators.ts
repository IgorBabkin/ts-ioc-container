import { IMethodDecorator } from '../../../helpers/IMethodDecorator';
import { OnDisposeHook } from './OnDisposeHook';
import { hooksMetadataCollector } from '../HooksMetadataCollector';
import getPrototypeOf = Reflect.getPrototypeOf;

export const onDispose: IMethodDecorator = (target, propertyKey) => {
    hooksMetadataCollector.addHookMethod(OnDisposeHook.HOOK_KEY, getPrototypeOf(target), propertyKey);
};
