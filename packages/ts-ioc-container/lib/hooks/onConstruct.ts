import { hook, HookType, prependHooks } from './hook';
import type { IInjector, IInjectorModule } from '../injector/IInjector';
import { HooksRunner } from './HooksRunner';
import type { ExecutionContext } from '../ExecutionContext';

export const onConstructHooksRunner = new HooksRunner('onConstruct');
// Decorators are applied bottom-up, so hooks are prepended to keep them in declaration order:
// `@onX(h1) @onX(h2) method()` runs h1 before h2.
export const onConstruct = (...fns: HookType[]) => hook('onConstruct', prependHooks(...fns));

export type OnExceptionHandler = (ex: unknown, context: ExecutionContext) => void;

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
 */
export class OnConstructModule implements IInjectorModule {
  constructor(private readonly onException?: OnExceptionHandler) {}

  applyTo(injector: IInjector) {
    /**
     * @throws {unknown} rethrows whatever the `onConstruct` hooks threw, when no `onException` handler was supplied.
     */
    injector.onConstructed((instance, scope) => {
      try {
        onConstructHooksRunner.execute(instance, { scope });
      } catch (ex) {
        if (!this.onException) {
          throw ex;
        }
        this.onException(ex, { scope });
      }
    });
  }
}
