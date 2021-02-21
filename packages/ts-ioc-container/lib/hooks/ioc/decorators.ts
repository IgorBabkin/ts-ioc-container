import { HooksMetadataCollector } from './HooksMetadataCollector';
import { ON_CONSTRUCT_HOOK_KEY } from './OnConstructHook';
import { IMethodDecorator } from '../../helpers/IMethodDecorator';
import getPrototypeOf = Reflect.getPrototypeOf;

export const hooksMetadataCollector = new HooksMetadataCollector();

export const onConstruct: IMethodDecorator = (target, propertyKey) => {
    console.log('onConstructDecorate');
    hooksMetadataCollector.addHookMethod(ON_CONSTRUCT_HOOK_KEY, getPrototypeOf(target), propertyKey);
};
