import { hook } from './hook';
import { SyncHooksRunner } from './runner/SyncHooksRunner';

export const onDisposeHooksRunner = new SyncHooksRunner('onDispose');
export const onDispose = hook('onDispose', (context) => {
  context.invokeMethod({});
});
