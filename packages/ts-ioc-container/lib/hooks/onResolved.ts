import { hook, HookType, prependHooks } from './hook';
import type { DependencyHook, IContainer, IContainerModule } from '../container/IContainer';
import { HooksRunner } from './HooksRunner';
import { registerPipe } from '../registration/IRegistration';
import { executeHooks, forEachResolvedObject, type OnResolvedOptions, toResolvedHooks } from './resolveHooks';

export const onResolvedHooksRunner = new HooksRunner('onResolved');

/**
 * Runs the decorated member when a dependency is resolved.
 *
 * ```typescript
 * class Connection {
 *   @onResolved()               // on every resolve
 *   log(): void {}
 *
 *   @onResolved({ once: true }) // on the first resolve of each instance
 *   open(): void {}
 *
 *   @onResolved({ once: true }, injectProp('Config')) // with explicit hooks
 *   config!: Config;
 * }
 * ```
 *
 * Naming no hook means "invoke the decorated method". Decorators are applied
 * bottom-up, so hooks are prepended to keep them in declaration order:
 * `@onX(h1) @onX(h2) method()` runs h1 before h2.
 */
export const onResolved = (first: OnResolvedOptions | HookType = {}, ...rest: HookType[]) =>
  hook('onResolved', prependHooks(...toResolvedHooks(first, rest)));

const runHooks: DependencyHook = forEachResolvedObject(executeHooks(onResolvedHooksRunner));

/**
 * Runs `onResolved` hooks every time a dependency object leaves a provider.
 *
 * Where `OnConstructModule` observes construction, this module observes
 * resolution — including the resolves of a value the container never
 * constructs, and the repeat resolves of one it did. A singleton caches its
 * dependency, so its hooks run on the resolve that filled the cache; a hook
 * declared with `{ once: true }` runs on the first resolve of its instance
 * however the dependency is registered.
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
