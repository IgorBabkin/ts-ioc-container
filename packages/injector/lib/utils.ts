import { constructor } from './types';
import { resolve } from './resolve';
import { getProp } from './metadata';
import { WriteFn } from './writeMonad';

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

export function composeDecorators(...decorators: ClassDecorator[]): ClassDecorator {
    return (target) => decorators.forEach((it) => it(target));
}

export const to =
    <T>(value: constructor<T>) =>
    <Context>(env: Context): T => {
        return resolve(env)(value);
    };

export const toOneOf =
    <Context>(...values: constructor<any>[]): WriteFn<Context, unknown> =>
    ([input, logs], instance: any) => {
        const Value = values.find((it) => {
            const predicate: (value: any) => boolean = getProp(it, 'predicate');
            if (!predicate) {
                throw new Error(`No predicate for ${it.name}`);
            }
            return predicate(instance);
        });
        return [Value ? resolve(input)(Value) : undefined, [...logs, 'toOneOf']];
    };
