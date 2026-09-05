import { HookFn } from './hook';
import { type Injectable, toMappedToken } from '../token/toToken';
import { type MapFn } from '../utils/fp';

/**
 * Injects a dependency into the decorated property.
 *
 * Every argument after the first is a mapper applied to the resolved instance, left to right —
 * `injectProp('key', sanitize(), validate())` passes the resolved instance through `sanitize()`,
 * then through `validate()`, and assigns the result.
 */
export function injectProp<T>(fn: Injectable<T>): HookFn;
export function injectProp<T, B>(fn: Injectable<T>, fn1: MapFn<T, B>): HookFn;
export function injectProp<T, B, C>(fn: Injectable<T>, fn1: MapFn<T, B>, fn2: MapFn<B, C>): HookFn;
export function injectProp<T, B, C, D>(fn: Injectable<T>, fn1: MapFn<T, B>, fn2: MapFn<B, C>, fn3: MapFn<C, D>): HookFn;
export function injectProp<T, B, C, D, E>(
  fn: Injectable<T>,
  fn1: MapFn<T, B>,
  fn2: MapFn<B, C>,
  fn3: MapFn<C, D>,
  fn4: MapFn<D, E>,
): HookFn;
export function injectProp<T, B, C, D, E, F>(
  fn: Injectable<T>,
  fn1: MapFn<T, B>,
  fn2: MapFn<B, C>,
  fn3: MapFn<C, D>,
  fn4: MapFn<D, E>,
  fn5: MapFn<E, F>,
): HookFn;
// Fallback for spreads or variable length chains (same type)
export function injectProp<T>(fn: Injectable<T>, ...mappers: MapFn<T>[]): HookFn;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function injectProp<T>(fn: Injectable<T>, ...mappers: MapFn<any, any>[]): HookFn {
  return (context) => context.setProperty(toMappedToken(fn, mappers));
}
