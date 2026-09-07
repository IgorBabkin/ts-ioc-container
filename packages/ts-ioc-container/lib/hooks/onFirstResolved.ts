import { hook, HookType, prependHooks } from './hook';
import type { IContainer, IContainerModule } from '../container/IContainer';
import { HooksRunner } from './HooksRunner';
import { Is } from '../utils/basic';

export const onFirstResolvedHooksRunner = new HooksRunner('onFirstResolved');
// Decorators are applied bottom-up, so hooks are prepended to keep them in declaration order:
// `@onX(h1) @onX(h2) method()` runs h1 before h2.
export const onFirstResolved = (...fns: HookType[]) => hook('onFirstResolved', prependHooks(...fns));

/**
 * Runs `onFirstResolved` hooks the first time a dependency object leaves a provider.
 *
 * Unlike `OnConstructModule`, which observes construction, this module observes
 * resolution: a value the container never constructs — a constant, a factory
 * result, an instance registered under several keys or cloned into several
 * scopes — is reported once, on its first resolve.
 *
 * Resolved objects are remembered in a `WeakSet` owned by the module instance,
 * so a dependency stays deduplicated for as long as it is alive and is
 * collectable once it is not. Non-object dependencies cannot be tracked that
 * way and are skipped.
 *
 * Providers are hooked through `onProviderRegistered`, so apply the module
 * before the registrations it should cover; scopes created afterwards inherit
 * it.
 */
export class OnFirstResolvedModule implements IContainerModule {
  private readonly resolvedDependencies = new WeakSet<object>();

  applyTo(container: IContainer) {
    container.onProviderRegistered((provider) => {
      /**
       * @throws {unknown} rethrows whatever the `onFirstResolved` hooks threw.
       */
      provider.onResolve((dependency, scope) => {
        if (!Is.object(dependency) || this.resolvedDependencies.has(dependency)) {
          return;
        }

        this.resolvedDependencies.add(dependency);
        onFirstResolvedHooksRunner.execute(dependency, { scope });
      });
    });
  }
}
