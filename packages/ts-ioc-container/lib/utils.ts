export type constructor<T> = new (...args: any[]) => T;

export type MapFn<T> = (value: T) => T;

export function pipe<T>(...mappers: MapFn<T>[]): MapFn<T> {
    return (value) => mappers.reduce((acc, current) => current(acc), value);
}
