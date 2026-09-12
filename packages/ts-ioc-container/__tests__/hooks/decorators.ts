import { hook, HookCollector, type HookType } from '../../lib';

// The library ships no predefined hook keys or decorators (ADR 0017): an
// application declares the key, the decorator which writes it, and the
// collector which reads it. These three are this suite's, and they are all a
// consumer writes to get what `@onConstruct` and friends used to provide.
export const onConstruct = (fn: HookType) => hook('onConstruct', fn);
export const onScopeDisposed = (fn: HookType) => hook('onScopeDisposed', fn);
export const onResolved = (fn: HookType) => hook('onResolved', fn);

export const onConstructHooks = new HookCollector({ key: 'onConstruct' });
export const onScopeDisposedHooks = new HookCollector({ key: 'onScopeDisposed' });
export const onResolvedHooks = new HookCollector({ key: 'onResolved' });
