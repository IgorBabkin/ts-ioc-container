export const setProp =
    <T>(key: string | symbol, value: T): ClassDecorator =>
    (target) => {
        Reflect.defineMetadata(key, value, target);
    };

export const reduceProp =
    <T>(key: string | symbol, fn: (acc: T) => T, init: T): ClassDecorator =>
    (target) => {
        const current: T = Reflect.getOwnMetadata(key, target) ?? init;
        Reflect.defineMetadata(key, fn(current), target);
    };

// eslint-disable-next-line @typescript-eslint/ban-types
export function getProp<T>(target: Object, key: string | symbol): T | undefined {
    return Reflect.getOwnMetadata(key, target) as T;
}
