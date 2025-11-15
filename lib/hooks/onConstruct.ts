import { hook, HookClass, HookFn } from './hook';
import { SyncHooksRunner } from './runner/SyncHooksRunner';
import type { IContainer } from '../container/IContainer';

import { constructor, Instance } from '../types';

export const onConstructHooksRunner = new SyncHooksRunner('onConstruct');
export const onConstruct = (fn: HookFn | constructor<HookClass>) => hook('onConstruct', fn);

export type OnConstructHook = (instance: Instance, scope: IContainer) => void;
