import { IMethodsMetadataCollector } from './IMethodsMetadataCollector';

export function createMethodHookDecorator(metadata: IMethodsMetadataCollector): MethodDecorator {
    return (target, propertyKey) => {
        // eslint-disable-next-line @typescript-eslint/ban-types
        metadata.addHook(target, propertyKey);
    };
}
