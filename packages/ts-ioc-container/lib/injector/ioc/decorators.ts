import { CONSTRUCTOR_METADATA_KEY, MetadataCollector } from './MetadataCollector';
import { ArgsFn } from '../../provider/IProvider';
import { InjectionToken } from '../../IServiceLocator';
import { InjectionItem } from './InjectionItem';

export const metadataCollector = new MetadataCollector();

export function Factory<T>(token: InjectionToken<T>): InjectionItem<T> {
    return new InjectionItem(token, { type: 'factory' });
}

export function injectProp<T>(item: InjectionToken | InjectionItem<T>, argsFn: ArgsFn = () => []): PropertyDecorator {
    return (target, propertyKey) => {
        metadataCollector.setMetadata(
            target,
            propertyKey,
            item instanceof InjectionItem ? item.withArgsFn(argsFn) : new InjectionItem(item, { argsFn }),
        );
    };
}

export function injectParam<T>(item: InjectionToken | InjectionItem<T>, argsFn: ArgsFn = () => []): ParameterDecorator {
    return (target, propertyKey, parameterIndex) => {
        const metadata = metadataCollector.getMetadata(target, CONSTRUCTOR_METADATA_KEY) || [];
        metadata[parameterIndex] =
            item instanceof InjectionItem ? item.withArgsFn(argsFn) : new InjectionItem(item, { argsFn });
        metadataCollector.setMetadata(target, CONSTRUCTOR_METADATA_KEY, metadata);
    };
}
