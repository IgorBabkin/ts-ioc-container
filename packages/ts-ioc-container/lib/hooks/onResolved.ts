import type { IContainer, IContainerModule } from '../container/IContainer';
import type { ProviderHook } from '../provider/IProvider';
import { HooksRunner, type OnExceptionHandler } from './HooksRunner';
import { registerPipe } from '../registration/IRegistration';
import { executeHooks, forEachResolvedObject, resolvedHook } from './resolveHooks';

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
 *   @onResolved()             // async members work the same way
 *   async warmUp(): Promise<void> {}
 *
 *   @onResolved(injectProp('Config')) // with explicit hooks
 *   config!: Config;
 * }
 * ```
 *
 * Hooks are a rest parameter, so a prepared list spreads: `@onResolved(...hooks)`.
 * Wrap a hook with `onceForEachInstance` to run it on the first resolve of each
 * instance only, e.g. `@onResolved(onceForEachInstance(invokeMethod))`.
 *
 * Naming no hook means "invoke the decorated method". Decorators are applied
 * bottom-up, so hooks are prepended to keep them in declaration order:
 * `@onX(h1) @onX(h2) method()` runs h1 before h2.
 */
export const onResolved = resolvedHook('onResolved');

const runHooks = (onException?: OnExceptionHandler): ProviderHook =>
  forEachResolvedObject(executeHooks(onResolvedHooksRunner, onException));

/**
 * Runs `onResolved` hooks every time a dependency object leaves a provider.
 *
 * Where `OnConstructModule` observes construction, this module observes
 * resolution — including the resolves of a value the container never
 * constructs, and the repeat resolves of one it did. A singleton caches its
 * dependency, so its hooks run on the resolve that filled the cache; a hook
 * wrapped in `onceForEachInstance` runs on the first resolve of its instance
 * however the dependency is registered.
 *
 * Providers are hooked through `onRegistered`, so apply the module
 * before the registrations it should cover; scopes created afterwards inherit
 * it. To opt in one registration instead of the whole container, use the
 * {@link resolved} pipe.
 *
 * Resolution stays synchronous: sync hooks finish before `resolve` returns,
 * async ones are started there and settle afterwards. A failure of either kind
 * is reported to `onException` when one is supplied; otherwise a sync hook
 * throws out of `resolve` and an async one surfaces as an unhandled promise
 * rejection.
 */
export class OnResolvedModule implements IContainerModule {
  private readonly runHooks: ProviderHook;

  constructor(onException?: OnExceptionHandler) {
    this.runHooks = runHooks(onException);
  }

  applyTo(container: IContainer) {
    container.onRegistered((provider) => {
      provider.onResolved(this.runHooks);
    });
  }
}

/**
 * Per-registration form of {@link OnResolvedModule}: the piped registration runs
 * its `onResolved` hooks on resolve, without the container opting every other
 * registration in.
 */
export const resolved = <T = unknown>(onException?: OnExceptionHandler) =>
  registerPipe<T>((p) => p.onResolved(runHooks(onException)));
