import { IMethodsMetadataCollector } from '../../decorators/instanceHook/IMethodsMetadataCollector';

export function createHookDecorator(metadata: IMethodsMetadataCollector): MethodDecorator {
    return (target, propertyKey) => {
        // eslint-disable-next-line @typescript-eslint/ban-types
        metadata.addHook(target, propertyKey);
    };
}
