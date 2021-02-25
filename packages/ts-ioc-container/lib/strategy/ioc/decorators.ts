import { InjectionItem, InjectMetadataCollector } from './InjectMetadataCollector';
import { ArgsFn } from '../../provider/IProvider';
import { constructor } from '../../helpers/types';

export const metadataCollector = new InjectMetadataCollector();

export function Factory<T>(token: InjectionToken<T>): InjectionItem<T> {
    return {
        token,
        type: 'factory',
        argsFn: () => [],
    };
}

export function Instance<T>(token: InjectionToken): InjectionItem<T> {
    return {
        token,
        type: 'instance',
        argsFn: () => [],
    };
}

export type InjectionToken<T = any> = constructor<T> | string | symbol;

export function inject<T>(item: InjectionToken | InjectionItem<T>, argsFn: ArgsFn = () => []): ParameterDecorator {
    return (target, _propertyKey, parameterIndex) => {
        metadataCollector.injectMetadata(
            target,
            parameterIndex,
            typeof item === 'object'
                ? {
                      ...item,
                      argsFn,
                  }
                : {
                      token: item,
                      type: 'instance',
                      argsFn,
                  },
        );
    };
}
