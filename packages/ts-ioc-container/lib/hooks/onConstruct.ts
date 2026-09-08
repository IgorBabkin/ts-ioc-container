import { hook, HookType, prependHooks } from './hook';
import type { IInjector, IInjectorModule } from '../injector/IInjector';
import { HooksRunner, type OnExceptionHandler, runHooks } from './HooksRunner';

export const onConstructHooksRunner = new HooksRunner('onConstruct');
// Decorators are applied bottom-up, so hooks are prepended to keep them in declaration order:
// `@onX(h1) @onX(h2) method()` runs h1 before h2.
export const onConstruct = (...fns: HookType[]) => hook('onConstruct', prependHooks(...fns));

/**
 * Runs `onConstruct` hooks when an instance is constructed.
 *
 * Construction is the injector's event, so this is an injector module: apply it
 * to the injector, then pass that injector to the container.
 *
 * ```typescript
 * const injector = new MetadataInjector().useModule(new OnConstructModule());
 * const container = new Container({ injector });
 * ```
 *
 * A container passes its injector to every scope it creates, so one injector
 * covers a whole scope tree.
 *
 * Hooks may be sync or async. Sync hooks finish before `resolve` returns;
 * resolution itself stays synchronous, so async hooks are started when the
 * instance is created and settle afterwards — `resolve` returns before they
 * finish. Instances that must expose readiness should publish it themselves,
 * for example by storing the pending promise on the instance.
 */
export class OnConstructModule implements IInjectorModule {
  constructor(private readonly onException?: OnExceptionHandler) {}

  applyTo(injector: IInjector) {
    /**
     * @throws {unknown} rethrows whatever the `onConstruct` hooks threw or rejected with, when no `onException`
     * handler was supplied — synchronously for a sync hook, as an unhandled promise rejection for an async one.
     */
    injector.onConstructed((instance, scope) => {
      runHooks(onConstructHooksRunner, instance, scope, this.onException);
    });
  }
}
