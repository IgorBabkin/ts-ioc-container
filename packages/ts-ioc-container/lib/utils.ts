export type constructor<T> = new (...args: any[]) => T;

export type MapFn<T> = (value: T) => T;

export function pipe<T>(...mappers: MapFn<T>[]): MapFn<T> {
    return (value) => mappers.reduce((acc, current) => current(acc), value);
}

export function merge<T>(baseArr: (T | undefined)[], insertArr: T[]): T[] {
    if (baseArr.length === 0) {
        return insertArr;
    }

    if (insertArr.length === 0) {
        return baseArr as T[];
    }
    const [b1, ...restBaseArr] = baseArr;
    const [i1, ...restInsertArr] = insertArr;
    return b1 === undefined
        ? [i1].concat(merge(restBaseArr, restInsertArr))
        : [b1].concat(merge(restBaseArr, insertArr));
}

export const constant =
    <T>(value: T) =>
    () =>
        value;
