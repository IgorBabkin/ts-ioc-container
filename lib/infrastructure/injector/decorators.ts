import { CONSTRUCTOR_METADATA_KEY } from './MetadataCollector';
import { ArgsFn } from '../../provider/IProvider';
import { InjectionToken } from '../../IServiceLocator';
import { InjectionItem } from '../../injector/ioc/item/InjectionItem';
import { IMetadataCollector } from '../../injector/ioc/IMetadataCollector';

export function Factory<T>(token: InjectionToken<T>): InjectionItem<T> {
    return new InjectionItem(token, { type: 'factory' });
}

export function createInjectDecorator(collector: IMetadataCollector) {
    return <T>(item: InjectionToken | InjectionItem<T>, argsFn: ArgsFn = () => []): ParameterDecorator => {
        return (target, propertyKey, parameterIndex) => {
            const metadata = collector.getMetadata<any[]>(target, CONSTRUCTOR_METADATA_KEY) || [];
            metadata[parameterIndex] =
                item instanceof InjectionItem ? item.withArgsFn(argsFn) : new InjectionItem(item, { argsFn });
            collector.setMetadata(target, CONSTRUCTOR_METADATA_KEY, metadata);
        };
    };
}
