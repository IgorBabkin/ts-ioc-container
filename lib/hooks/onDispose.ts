import { hook } from './hook';
import { SyncHooksRunner } from './runner/SyncHooksRunner';
import type { IContainer } from '../container/IContainer';

export const onDisposeHooksRunner = new SyncHooksRunner('onDispose');
export const onDispose = hook('onDispose', (context) => {
  context.invokeMethod({});
});

export type OnDisposeHook = (scope: IContainer) => void;
