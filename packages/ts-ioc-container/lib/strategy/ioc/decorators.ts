import { CONSTRUCTOR_INJECTION_METADATA_KEY, InjectMetadataCollector } from './InjectMetadataCollector';
import { ArgsFn } from '../../provider/IProvider';
import { InjectionToken } from '../../IServiceLocator';
import { Injector } from './Injector';

export const metadataCollector = new InjectMetadataCollector();

export function Factory<T>(token: InjectionToken<T>): Injector<T> {
    return new Injector(token, { type: 'factory' });
}

export function inject<T>(
    item: InjectionToken | Injector<T>,
    argsFn: ArgsFn = () => [],
): ParameterDecorator | PropertyDecorator {
    return (target, propertyKey, parameterIndex) => {
        if (parameterIndex === undefined) {
            injectProperty(item, argsFn)(target, propertyKey);
        } else {
            injectConstructorParam(item, argsFn)(target, propertyKey, parameterIndex);
        }
    };
}

export function injectProperty<T>(item: InjectionToken | Injector<T>, argsFn: ArgsFn = () => []): PropertyDecorator {
    return (target, propertyKey) => {
        metadataCollector.setMetadata(
            target,
            propertyKey,
            item instanceof Injector ? item.withArgsFn(argsFn) : new Injector(item, { argsFn }),
        );
    };
}

export function injectConstructorParam<T>(
    item: InjectionToken | Injector<T>,
    argsFn: ArgsFn = () => [],
): ParameterDecorator {
    return (target, propertyKey, parameterIndex) => {
        const metadata = metadataCollector.getMetadata(target, CONSTRUCTOR_INJECTION_METADATA_KEY) || [];
        metadata[parameterIndex] = item instanceof Injector ? item.withArgsFn(argsFn) : new Injector(item, { argsFn });
        metadataCollector.setMetadata(target, CONSTRUCTOR_INJECTION_METADATA_KEY, metadata);
    };
}
