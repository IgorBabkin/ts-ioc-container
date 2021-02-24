import { IMethodDecorator } from '../../../helpers/IMethodDecorator';
import getPrototypeOf = Reflect.getPrototypeOf;
import { ON_DISPOSE_HOOK_KEY } from './OnDisposeHook';
import { hooksMetadataCollector } from '../HooksMetadataCollector';

export const onDispose: IMethodDecorator = (target, propertyKey) => {
    hooksMetadataCollector.addHookMethod(ON_DISPOSE_HOOK_KEY, getPrototypeOf(target), propertyKey);
};
