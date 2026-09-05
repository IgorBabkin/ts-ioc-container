import { type IContainer, type IContainerModule } from './IContainer';

/**
 * Enables eager resolution of providers marked with the `autoResolve()` pipe.
 *
 * Every scope created after this module is applied resolves its own
 * auto-resolvable providers as part of `createScope`, so the instances exist
 * before anyone asks for them. Child scopes inherit the behaviour, so a single
 * `useModule` call on the root covers the whole scope tree.
 *
 * The container the module is applied to is not a created scope — call
 * `container.autoResolve()` explicitly to eagerly resolve its own providers.
 */
export class AutoResolveModule implements IContainerModule {
  applyTo(container: IContainer): void {
    container.addOnScopeCreatedHook((scope) => scope.autoResolve());
  }
}
