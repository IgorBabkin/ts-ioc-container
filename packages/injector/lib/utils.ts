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

export const id = <T>(value: T) => value;

export function composeClassDecorators(...decorators: ClassDecorator[]): ClassDecorator {
    return (target) => decorators.forEach((it) => it(target));
}

type Fn<A, B> = (value: A) => B;

export function pipe<A, B>(a: Fn<A, B>): Fn<A, B>;
export function pipe<A, B, C>(a: Fn<A, B>, b: Fn<B, C>): Fn<A, C>;
export function pipe<A, B, C, D>(a: Fn<A, B>, b: Fn<B, C>, c: Fn<C, D>): Fn<A, D>;
export function pipe<A, B, C, D, E>(a: Fn<A, B>, b: Fn<B, C>, c: Fn<C, D>, d: Fn<D, E>): Fn<A, E>;

export function pipe(...fns: any[]) {
    return (value: any) => fns.reduce((acc, next) => next(acc), value);
}

export type Write<T> = [T, string[]];
export const pure = <T>(value: T): Write<T> => [value, []];
export const run = <T>([value]: Write<T>): T => value;
