import { HookFn, InjectFn } from './hook';

/**
 * Injects a dependency into the decorated property.
 *
 * `fn` is an `InjectFn`, exactly as for `@inject`: it receives the resolution
 * context and returns the value to assign, so `injectProp(({ scope }) =>
 * scope.resolve('key'))` assigns the dependency and `injectProp(pipe(fn, sanitize()))`
 * a mapped one.
 */
export const injectProp =
  <T>(fn: InjectFn<T>): HookFn =>
  (context) =>
    context.setProperty(fn);
