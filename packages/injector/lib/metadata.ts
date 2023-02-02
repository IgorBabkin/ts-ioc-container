import { PropNotFoundError } from './errors/PropNotFoundError';

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

export const field =
    <T>(key: string | symbol, value: T): PropertyDecorator =>
    (target, propertyKey) => {
        const metadata = Reflect.getMetadata(key, target) ?? new Map();
        metadata.set(propertyKey, value);
        Reflect.defineMetadata(key, metadata, target);
    };

// eslint-disable-next-line @typescript-eslint/ban-types
export function getProp<T>(target: Object, key: string | symbol): T | undefined {
    return Reflect.getOwnMetadata(key, target) as T;
}

// eslint-disable-next-line @typescript-eslint/ban-types
export function getPropOrFail<T>(target: Object, key: string | symbol): T {
    const value = getProp<T>(target, key);
    if (!value) {
        throw new PropNotFoundError(`Cannot find prop - ${key.toString()}`);
    }
    return value;
}
