import { constructor } from './types';
import { resolve } from './resolve';
import { Write } from './writeMonad';

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

export const to =
    <T>(value: constructor<T>) =>
    <Context>([env, logs]: Write<Context>): Write<T> => {
        return [resolve(env)(value), logs];
    };
