import { hook, HookClass, HookFn } from './hook';
import type { IContainer } from '../container/IContainer';
import { constructor } from '../types';
import { HooksRunner } from './HooksRunner';

export const onDisposeHooksRunner = new HooksRunner('onDispose');
export const onDispose = (fn: HookFn | constructor<HookClass>) => hook('onDispose', fn);

export type OnDisposeHook = (scope: IContainer) => void;
