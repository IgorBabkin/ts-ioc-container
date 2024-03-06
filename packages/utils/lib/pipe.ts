import { InjectFn } from './types';

export type Fn<A, B> = (value: A, ...args: any[]) => B;
export function pipe<A, B>(a: Fn<A, B>): Fn<A, B>;
export function pipe<A, B, C>(a: Fn<A, B>, b: Fn<B, C>): Fn<A, C>;
export function pipe<A, B, C, D>(a: Fn<A, B>, b: Fn<B, C>, c: Fn<C, D>): Fn<A, D>;
export function pipe<A, B, C, D, E>(a: Fn<A, B>, b: Fn<B, C>, c: Fn<C, D>, d: Fn<D, E>): Fn<A, E>;
export function pipe<A, B, C, D, E, F>(a: Fn<A, B>, b: Fn<B, C>, c: Fn<C, D>, d: Fn<D, E>, e: Fn<E, F>): Fn<A, F>;
export function pipe<A, B, C, D, E, F, G>(
  a: Fn<A, B>,
  b: Fn<B, C>,
  c: Fn<C, D>,
  d: Fn<D, E>,
  e: Fn<E, F>,
  f: Fn<F, G>,
): Fn<A, G>;
export function pipe<A, B, C, D, E, F, G, H>(
  a: Fn<A, B>,
  b: Fn<B, C>,
  c: Fn<C, D>,
  d: Fn<D, E>,
  e: Fn<E, F>,
  f: Fn<F, G>,
  g: Fn<G, H>,
): Fn<A, H>;
export function pipe<A, B, C, D, E, F, G, H, I>(
  a: Fn<A, B>,
  b: Fn<B, C>,
  c: Fn<C, D>,
  d: Fn<D, E>,
  e: Fn<E, F>,
  f: Fn<F, G>,
  g: Fn<G, H>,
  h: Fn<H, I>,
): Fn<A, I>;
export function pipe<A, B, C, D, E, F, G, H, I, J>(
  a: Fn<A, B>,
  b: Fn<B, C>,
  c: Fn<C, D>,
  d: Fn<D, E>,
  e: Fn<E, F>,
  f: Fn<F, G>,
  g: Fn<G, H>,
  h: Fn<H, I>,
  i: Fn<I, J>,
): Fn<A, J>;

export function pipe<Context>(...fns: any[]): InjectFn<Context> {
  return (value, ...args) => fns.reduce((acc, next) => next(acc, ...args), value);
}
