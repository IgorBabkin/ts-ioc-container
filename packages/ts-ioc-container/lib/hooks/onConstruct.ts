import { hook, HookType, prependHooks } from './hook';
import type { IContainer, IContainerModule } from '../container/IContainer';
import { HooksRunner } from './HooksRunner';
import type { ExecutionContext } from '../ExecutionContext';

export const onConstructHooksRunner = new HooksRunner('onConstruct');
// Decorators are applied bottom-up, so hooks are prepended to keep them in declaration order:
// `@onX(h1) @onX(h2) method()` runs h1 before h2.
export const onConstruct = (...fns: HookType[]) => hook('onConstruct', prependHooks(...fns));

export type OnExceptionHandler = (ex: unknown, context: ExecutionContext) => void;

export class OnConstructModule implements IContainerModule {
  constructor(private readonly onException?: OnExceptionHandler) {}

  applyTo(container: IContainer) {
    /**
     * @throws {unknown} rethrows whatever the `onConstruct` hooks threw, when no `onException` handler was supplied.
     */
    container.onConstruct((instance, scope) => {
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
