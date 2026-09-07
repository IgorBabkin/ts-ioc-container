import type { DependencyHook, IContainer, IContainerModule } from '../container/IContainer';
import { HooksRunner } from './HooksRunner';
import { registerPipe } from '../registration/IRegistration';
import { executeHooks, forEachResolvedObject, onceResolvedHook, resolvedHook } from './resolveHooks';

export const onResolvedHooksRunner = new HooksRunner('onResolved');

/**
 * Runs the decorated member when a dependency is resolved.
 *
 * ```typescript
 * class Connection {
 *   @onResolved()             // invoke this method on every resolve
 *   log(): void {}
 *
 *   @onResolved(invokeMethod) // the same declaration, spelled out
 *   ping(): void {}
 *
 *   @onResolved(injectProp('Config')) // with explicit hooks
 *   config!: Config;
 * }
 * ```
 *
 * Hooks are a rest parameter, so a prepared list spreads: `@onResolved(...hooks)`.
 * Use `@onceResolved` to run them on the first resolve of each instance only.
 *
 * Naming no hook means "invoke the decorated method". Decorators are applied
 * bottom-up, so hooks are prepended to keep them in declaration order:
 * `@onX(h1) @onX(h2) method()` runs h1 before h2.
 */
export const onResolved = resolvedHook('onResolved');

/**
 * `@onResolved`, narrowed to the first resolve of each instance: the hooks run
 * once for an instance and stay silent on every later resolve of it, however
 * many keys or scopes hand it out.
 */
export const onceResolved = onceResolvedHook('onResolved');

const runHooks: DependencyHook = forEachResolvedObject(executeHooks(onResolvedHooksRunner));

/**
 * Runs `onResolved` hooks every time a dependency object leaves a provider.
 *
 * Where `OnConstructModule` observes construction, this module observes
 * resolution — including the resolves of a value the container never
 * constructs, and the repeat resolves of one it did. A singleton caches its
 * dependency, so its hooks run on the resolve that filled the cache; an
 * `@onceResolved` hook runs on the first resolve of its instance however the
 * dependency is registered.
 *
 * Providers are hooked through `onProviderRegistered`, so apply the module
 * before the registrations it should cover; scopes created afterwards inherit
 * it. To opt in one registration instead of the whole container, use the
 * {@link resolved} pipe.
 */
export class OnResolvedModule implements IContainerModule {
  applyTo(container: IContainer) {
    container.onProviderRegistered((provider) => {
      provider.onResolve(runHooks);
    });
  }
}

/**
 * Per-registration form of {@link OnResolvedModule}: the piped registration runs
 * its `onResolved` hooks on resolve, without the container opting every other
 * registration in.
 */
export const resolved = <T = unknown>() => registerPipe<T>((p) => p.onResolve(runHooks));
