import { hook, HookFn } from './hook';
import { SyncHooksRunner } from './runner/SyncHooksRunner';
import type { IContainer, Instance } from '../container/IContainer';

export const onConstructHooksRunner = new SyncHooksRunner('onConstruct');
export const onConstruct = (fn: HookFn) => hook('onConstruct', fn);

export type OnConstructHook = (instance: Instance, scope: IContainer) => void;
