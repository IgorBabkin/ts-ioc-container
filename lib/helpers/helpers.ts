import { ArgsFn } from '../core/providers/IProvider';

export function args(...deps: any[]): ArgsFn {
    return () => [...deps];
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

export function toArray<T>(value: T | T[]): T[] {
    return value instanceof Array ? value : [value];
}

export const constant =
    <T>(value: T) =>
    () =>
        value;
