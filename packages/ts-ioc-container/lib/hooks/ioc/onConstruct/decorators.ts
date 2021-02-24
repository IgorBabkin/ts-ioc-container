import { ON_CONSTRUCT_HOOK_KEY } from './OnConstructHook';
import { IMethodDecorator } from '../../../helpers/IMethodDecorator';
import getPrototypeOf = Reflect.getPrototypeOf;
import { hooksMetadataCollector } from '../HooksMetadataCollector';

export const onConstruct: IMethodDecorator = (target, propertyKey) => {
    hooksMetadataCollector.addHookMethod(ON_CONSTRUCT_HOOK_KEY, getPrototypeOf(target), propertyKey);
};
