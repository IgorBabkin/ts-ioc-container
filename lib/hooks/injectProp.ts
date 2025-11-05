import type { InjectFn } from './HookContext';
import { DependencyKey } from '../container/IContainer';
import type { constructor } from '../utils';
import { HookFn } from './hook';
import { InjectionToken } from '../token/InjectionToken';
import { toToken } from '../token/toToken';

export const injectProp =
  (fn: InjectFn | InjectionToken | DependencyKey | constructor<unknown>): HookFn =>
  (context) =>
    context.setProperty(toToken(fn));
