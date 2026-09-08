import type { IContainer, IContainerModule } from '../container/IContainer';
import { HooksRunner } from './HooksRunner';
import { registerPipe } from '../registration/IRegistration';
import { executeHooks, forEachResolvedObject, onceResolvedHook, resolvedHook } from './resolveHooks';
import type { OnExceptionHandler } from '../ExecutionContext';

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

const runHooks = (onException?: OnExceptionHandler) =>
  forEachResolvedObject(executeHooks(onResolvedHooksRunner, onException));

/**
 * Runs `onResolved` hooks every time a dependency object leaves a provider.
 *
 * This is the container's one construction-time hook point: it observes
 * resolution rather than construction, which covers the resolves of a value the
 * container never constructed and the repeat resolves of one it did. A singleton
 * caches its dependency, so its hooks run on the resolve that filled the cache;
 * an `@onceResolved` hook runs on the first resolve of its instance however the
 * dependency is registered. Resolving a bare class is covered too — the
 * container makes up a provider for it.
 *
 * Providers are hooked through `onProviderRegistered`, so apply the module
 * before the registrations it should cover; scopes created afterwards inherit
 * it. To opt in one registration instead of the whole container, use the
 * {@link resolved} pipe.
 *
 * Exceptions are reported to `onException` when one is supplied, and rethrown
 * out of `resolve` otherwise.
 */
export class OnResolvedModule implements IContainerModule {
  private readonly runHooks;

  constructor(onException?: OnExceptionHandler) {
    this.runHooks = runHooks(onException);
  }

  applyTo(container: IContainer) {
    container.onProviderRegistered((provider) => {
      provider.onResolve(this.runHooks);
    });
  }
}

/**
 * Per-registration form of {@link OnResolvedModule}: the piped registration runs
 * its `onResolved` hooks on resolve, without the container opting every other
 * registration in.
 */
export const resolved = <T = unknown>(onException?: OnExceptionHandler) =>
  registerPipe<T>((p) => p.onResolve(runHooks(onException)));
