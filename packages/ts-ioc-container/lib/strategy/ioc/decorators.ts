import { InjectionItem, InjectMetadataCollector } from './InjectMetadataCollector';
import { IFieldDecorator } from '../../IFieldDecorator';

export type constructor<T> = new (...args: any[]) => T;
export const metadataCollector = new InjectMetadataCollector();

export function Factory<T>(token: InjectionToken<T>, ...args: any[]): InjectionItem<T> {
    return {
        token,
        type: 'factory',
        args,
    };
}

export function Instance<T>(token: InjectionToken, ...args: any[]): InjectionItem<T> {
    return {
        token,
        type: 'instance',
        args,
    };
}

export type InjectionToken<T = any> = constructor<T> | string | symbol;

export function inject<T>(item: InjectionToken | InjectionItem<T>, ...args: any[]): IFieldDecorator {
    return (target, _propertyKey, parameterIndex) => {
        metadataCollector.injectMetadata(
            target,
            parameterIndex,
            typeof item === 'object' ? item : Instance(item, ...args),
        );
    };
}
