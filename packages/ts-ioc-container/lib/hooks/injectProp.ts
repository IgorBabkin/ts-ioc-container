import { DependencyKey } from '../container/IContainer';
import { HookFn, InjectFn } from './hook';
import { InjectionToken } from '../token/InjectionToken';
import { toToken } from '../token/toToken';
import { type constructor } from '../utils/basic';

export const injectProp =
  (fn: InjectFn | InjectionToken | DependencyKey | constructor<unknown>): HookFn =>
  (context) =>
    context.setProperty(toToken(fn));
