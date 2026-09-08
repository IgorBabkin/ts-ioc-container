import { hook, HookType, prependHooks } from './hook';
import type { IInjector, IInjectorModule } from '../injector/IInjector';
import { HooksRunner } from './HooksRunner';
import type { OnExceptionHandler } from './onConstruct';

export const onConstructAsyncHooksRunner = new HooksRunner('onConstructAsync');
// Decorators are applied bottom-up, so hooks are prepended to keep them in declaration order:
// `@onX(h1) @onX(h2) method()` runs h1 before h2.
export const onConstructAsync = (...fns: HookType[]) => hook('onConstructAsync', prependHooks(...fns));

/**
 * Runs `onConstructAsync` hooks when an instance is constructed.
 *
 * Resolution stays synchronous, so async construct hooks are started when the
 * instance is tracked and settle afterwards: `resolve` returns before they
 * finish. Instances that must expose readiness should publish it themselves,
 * for example by storing the pending promise on the instance.
 *
 * Like `OnConstructModule`, this is an injector module — see there for how to
 * apply one.
 */
export class OnConstructAsyncModule implements IInjectorModule {
  constructor(private readonly onException?: OnExceptionHandler) {}

  applyTo(injector: IInjector) {
    injector.onConstructed((instance, scope) => {
      if (!onConstructAsyncHooksRunner.hasHooks(instance)) {
        return;
      }

      /**
       * @throws {unknown} rethrows whatever the `onConstructAsync` hooks rejected with, as an unhandled promise
       * rejection, when no `onException` handler was supplied.
       */
      onConstructAsyncHooksRunner.executeAsync(instance, { scope }).catch((ex) => {
        if (!this.onException) {
          throw ex;
        }
        this.onException(ex, { scope });
      });
    });
  }
}
