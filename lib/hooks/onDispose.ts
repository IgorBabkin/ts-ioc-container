import { hook, HookClass, HookFn } from './hook';
import { SyncHooksRunner } from './runner/SyncHooksRunner';
import type { IContainer } from '../container/IContainer';
import { constructor } from '../types';

export const onDisposeHooksRunner = new SyncHooksRunner('onDispose');
export const onDispose = (fn: HookFn | constructor<HookClass>) => hook('onDispose', fn);

export type OnDisposeHook = (scope: IContainer) => void;
