import { DependencyKey } from '../container/IContainer';
import { HookFn, InjectFn } from './hook';
import { InjectionToken } from '../token/InjectionToken';
import { toToken } from '../token/toToken';
import { constructor } from '../types';

export const injectProp =
  (fn: InjectFn | InjectionToken | DependencyKey | constructor<unknown>): HookFn =>
  (context) =>
    context.setProperty(toToken(fn));
