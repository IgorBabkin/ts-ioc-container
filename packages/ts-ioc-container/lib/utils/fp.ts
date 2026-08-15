export type MapFn<A, B = A> = (value: A) => B;

// Overloads for fp function to support up to 10 transformations
export function pipe<A>(fn1: MapFn<A>): MapFn<A>;
export function pipe<A, B>(fn1: MapFn<A, B>): MapFn<A, B>;
export function pipe<A, B, C>(fn1: MapFn<A, B>, fn2: MapFn<B, C>): MapFn<A, C>;
export function pipe<A, B, C, D>(fn1: MapFn<A, B>, fn2: MapFn<B, C>, fn3: MapFn<C, D>): MapFn<A, D>;
export function pipe<A, B, C, D, E>(
  fn1: MapFn<A, B>,
  fn2: MapFn<B, C>,
  fn3: MapFn<C, D>,
  fn4: MapFn<D, E>,
): MapFn<A, E>;
export function pipe<A, B, C, D, E, F>(
  fn1: MapFn<A, B>,
  fn2: MapFn<B, C>,
  fn3: MapFn<C, D>,
  fn4: MapFn<D, E>,
  fn5: MapFn<E, F>,
): MapFn<A, F>;
export function pipe<A, B, C, D, E, F, G>(
  fn1: MapFn<A, B>,
  fn2: MapFn<B, C>,
  fn3: MapFn<C, D>,
  fn4: MapFn<D, E>,
  fn5: MapFn<E, F>,
  fn6: MapFn<F, G>,
): MapFn<A, G>;
export function pipe<A, B, C, D, E, F, G, H>(
  fn1: MapFn<A, B>,
  fn2: MapFn<B, C>,
  fn3: MapFn<C, D>,
  fn4: MapFn<D, E>,
  fn5: MapFn<E, F>,
  fn6: MapFn<F, G>,
  fn7: MapFn<G, H>,
): MapFn<A, H>;
export function pipe<A, B, C, D, E, F, G, H, I>(
  fn1: MapFn<A, B>,
  fn2: MapFn<B, C>,
  fn3: MapFn<C, D>,
  fn4: MapFn<D, E>,
  fn5: MapFn<E, F>,
  fn6: MapFn<F, G>,
  fn7: MapFn<G, H>,
  fn8: MapFn<H, I>,
): MapFn<A, I>;
export function pipe<A, B, C, D, E, F, G, H, I, J>(
  fn1: MapFn<A, B>,
  fn2: MapFn<B, C>,
  fn3: MapFn<C, D>,
  fn4: MapFn<D, E>,
  fn5: MapFn<E, F>,
  fn6: MapFn<F, G>,
  fn7: MapFn<G, H>,
  fn8: MapFn<H, I>,
  fn9: MapFn<I, J>,
): MapFn<A, J>;
export function pipe<A, B, C, D, E, F, G, H, I, J, K>(
  fn1: MapFn<A, B>,
  fn2: MapFn<B, C>,
  fn3: MapFn<C, D>,
  fn4: MapFn<D, E>,
  fn5: MapFn<E, F>,
  fn6: MapFn<F, G>,
  fn7: MapFn<G, H>,
  fn8: MapFn<H, I>,
  fn9: MapFn<I, J>,
  fn10: MapFn<J, K>,
): MapFn<A, K>;
// Fallback for cases where pipes are used with spreads or variable length (same type)

export function pipe<T>(...mappers: MapFn<T>[]): MapFn<T>;
// Implementation
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function pipe(...mappers: MapFn<any, any>[]): MapFn<any, any> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (value: any) => mappers.reduce((acc, current) => current(acc), value);
}
