import { InjectionItem, InjectMetadataCollector } from './InjectMetadataCollector';
import { IFieldDecorator } from '../../IFieldDecorator';
import { ArgsFn } from '../../IRegistration';

export type constructor<T> = new (...args: any[]) => T;
export const metadataCollector = new InjectMetadataCollector();

export function Factory<T>(token: InjectionToken<T>, argsFn: ArgsFn = () => []): InjectionItem<T> {
    return {
        token,
        type: 'factory',
        argsFn,
    };
}

export function Instance<T>(token: InjectionToken, argsFn: ArgsFn = () => []): InjectionItem<T> {
    return {
        token,
        type: 'instance',
        argsFn,
    };
}

export type InjectionToken<T = any> = constructor<T> | string | symbol;

export function inject<T>(item: InjectionToken | InjectionItem<T>, argsFn: ArgsFn = () => []): IFieldDecorator {
    return (target, _propertyKey, parameterIndex) => {
        metadataCollector.injectMetadata(
            target,
            parameterIndex,
            typeof item === 'object'
                ? {
                      ...item,
                      argsFn: (l) => [...item.argsFn(l), ...argsFn(l)],
                  }
                : Instance(item, argsFn),
        );
    };
}
