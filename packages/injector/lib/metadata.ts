import { constructor } from './types';

export const prop =
    <T>(key: string | symbol, value: T): ClassDecorator =>
    (target) => {
        Reflect.defineMetadata(key, value, target);
    };

export const attr =
    (key: string | symbol) =>
    <T>(value: T): ParameterDecorator =>
    (target, propertyKey, parameterIndex) => {
        const metadata = Reflect.getOwnMetadata(key, target) ?? [];
        metadata[parameterIndex] = value;
        Reflect.defineMetadata(key, metadata, target);
    };

export const getProp = <T>(target: constructor<unknown>, key: string | symbol): T | undefined =>
    Reflect.getOwnMetadata(key, target) as T;
