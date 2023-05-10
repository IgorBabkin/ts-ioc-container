export type constructor<T> = new (...args: any[]) => T;

export type MapFn<T> = (value: T) => T;

type Fn<A, B> = (a: A) => B;

export function pipe<A, B, C>(a: Fn<A, B>, b: Fn<B, C>): Fn<A, C> {
    return (x) => b(a(x));
}

export const identity = <T>(value: T) => value;
