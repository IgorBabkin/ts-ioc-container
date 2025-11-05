import { hook, HookFn } from './hook';
import { SyncHooksRunner } from './runner/SyncHooksRunner';

export const onConstructHooksRunner = new SyncHooksRunner('onConstruct');
export const onConstruct = (fn: HookFn) => hook('onConstruct', fn);
