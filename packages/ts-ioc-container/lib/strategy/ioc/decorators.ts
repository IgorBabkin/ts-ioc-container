import { InjectionItem, InjectMetadataCollector } from './InjectMetadataCollector';
import { IFieldDecorator } from '../../IFieldDecorator';

export type constructor<T> = new (...args: any[]) => T;
export const metadataCollector = new InjectMetadataCollector();

export function Factory<T>(token: InjectionToken<T>): InjectionItem<T> {
    return {
        token,
        type: 'factory',
    };
}

export function Instance<T>(token: InjectionToken): InjectionItem<T> {
    return {
        token,
        type: 'instance',
    };
}

export type InjectionToken<T = any> = constructor<T> | string | symbol;

export function inject<T>(item: InjectionToken | InjectionItem<T>): IFieldDecorator {
    console.log('inject: root');
    return (target, _propertyKey, parameterIndex) => {
        console.log('inject: child');
        if (typeof item === 'object') {
            metadataCollector.injectMetadata(target, parameterIndex, item);
        } else {
            metadataCollector.injectMetadata(target, parameterIndex, {
                token: item,
                type: 'instance',
            });
        }
    };
}

export function injectable<T>(target: T): void {
    console.log('injectable', target);
}
