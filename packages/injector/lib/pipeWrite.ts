import { InjectFn } from './types';
import { Fn, pipe } from './pipe';

export type Write<T> = [T, string[]];
function pure<T>(value: T): Write<T> {
    return [value, []];
}
function run<T>([value]: Write<T>): T {
    return value;
}

export type WriteFn<A, B> = (value: Write<A>, ...args: any[]) => Write<B>;

export function pipeWrite<A, B>(a: WriteFn<A, B>): Fn<A, B>;
export function pipeWrite<A, B, C>(a: WriteFn<A, B>, b: WriteFn<B, C>): Fn<A, C>;
export function pipeWrite<A, B, C, D>(a: WriteFn<A, B>, b: WriteFn<B, C>, c: WriteFn<C, D>): Fn<A, D>;
export function pipeWrite<A, B, C, D, E>(
    a: WriteFn<A, B>,
    b: WriteFn<B, C>,
    c: WriteFn<C, D>,
    d: WriteFn<D, E>,
): Fn<A, E>;
export function pipeWrite<A, B, C, D, E, F>(
    a: WriteFn<A, B>,
    b: WriteFn<B, C>,
    c: WriteFn<C, D>,
    d: WriteFn<D, E>,
    e: WriteFn<E, F>,
): Fn<A, F>;
export function pipeWrite<A, B, C, D, E, F, G>(
    a: WriteFn<A, B>,
    b: WriteFn<B, C>,
    c: WriteFn<C, D>,
    d: WriteFn<D, E>,
    e: WriteFn<E, F>,
    f: WriteFn<F, G>,
): Fn<A, G>;
export function pipeWrite<A, B, C, D, E, F, G, H>(
    a: WriteFn<A, B>,
    b: WriteFn<B, C>,
    c: WriteFn<C, D>,
    d: WriteFn<D, E>,
    e: WriteFn<E, F>,
    f: WriteFn<F, G>,
    g: WriteFn<G, H>,
): Fn<A, H>;
export function pipeWrite<A, B, C, D, E, F, G, H, I>(
    a: WriteFn<A, B>,
    b: WriteFn<B, C>,
    c: WriteFn<C, D>,
    d: WriteFn<D, E>,
    e: WriteFn<E, F>,
    f: WriteFn<F, G>,
    g: WriteFn<G, H>,
    h: WriteFn<H, I>,
): Fn<A, I>;
export function pipeWrite<A, B, C, D, E, F, G, H, I, J>(
    a: WriteFn<A, B>,
    b: WriteFn<B, C>,
    c: WriteFn<C, D>,
    d: WriteFn<D, E>,
    e: WriteFn<E, F>,
    f: WriteFn<F, G>,
    g: WriteFn<G, H>,
    h: WriteFn<H, I>,
    i: WriteFn<I, J>,
): Fn<A, J>;

export function pipeWrite<Context>(...fns: any[]): InjectFn<Context> {
    // @ts-ignore
    return pipe.apply(null, [pure, ...fns, run]);
}
