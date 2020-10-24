import 'reflect-metadata';
import { InjectionItem, MetadataCollector } from './MetadataCollector';

export type constructor<T> = new (...args: any[]) => T;
export const metadataCollector = new MetadataCollector();

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

export function inject<T>(
    item: InjectionToken | InjectionItem<T>,
): (target: any, propertyKey: string | symbol, parameterIndex: number) => void {
    return (target: any, _propertyKey: string | symbol, parameterIndex: number): void => {
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
