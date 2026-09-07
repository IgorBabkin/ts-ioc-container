import { hook, HookType, prependHooks } from './hook';
import type { IContainer, IContainerModule } from '../container/IContainer';
import { HooksRunner } from './HooksRunner';
import { registerPipe } from '../registration/IRegistration';
import { executeHooksAsync, forEachResolvedObject, type OnResolvedOptions, toResolvedHooks } from './resolveHooks';
import type { OnExceptionHandler } from './onConstruct';

export const onResolvedAsyncHooksRunner = new HooksRunner('onResolvedAsync');

/**
 * Async counterpart of `onResolved`, taking the same `{ once: true }` option and
 * the same "no hook means invoke the decorated method" shorthand.
 *
 * ```typescript
 * class Connection {
 *   @onResolvedAsync({ once: true })
 *   async open(): Promise<void> {}
 * }
 * ```
 */
export const onResolvedAsync = (first: OnResolvedOptions | HookType = {}, ...rest: HookType[]) =>
  hook('onResolvedAsync', prependHooks(...toResolvedHooks(first, rest)));

const runHooks = (onException?: OnExceptionHandler) =>
  forEachResolvedObject(executeHooksAsync(onResolvedAsyncHooksRunner, onException));

/**
 * Async counterpart of `OnResolvedModule`: runs `onResolvedAsync` hooks when a
 * dependency object leaves a provider.
 *
 * Resolution stays synchronous, so the hooks are started on resolve and settle
 * afterwards: `resolve` returns before they finish. Dependencies that must
 * expose readiness should publish it themselves, for example by storing the
 * pending promise on the instance.
 *
 * Rejections are reported to `onException` when one is supplied, and surface as
 * unhandled promise rejections otherwise.
 */
export class OnResolvedAsyncModule implements IContainerModule {
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
 * Per-registration form of {@link OnResolvedAsyncModule}, mirroring `resolved()`.
 */
export const resolvedAsync = <T = unknown>(onException?: OnExceptionHandler) =>
  registerPipe<T>((p) => p.onResolve(runHooks(onException)));
