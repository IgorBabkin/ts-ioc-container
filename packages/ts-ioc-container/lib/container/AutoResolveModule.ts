import { type AutoResolveOptions, type IContainer, type IContainerModule } from './IContainer';

/**
 * Enables eager resolution of providers marked with the `autoResolve()` pipe.
 *
 * Every scope created after this module is applied resolves its own
 * auto-resolvable providers as part of `createScope`, so the instances exist
 * before anyone asks for them. Child scopes inherit the behaviour, so a single
 * `useModule` call on the root covers the whole scope tree.
 *
 * `options.args` are forwarded to every eagerly resolved provider of every such
 * scope. Pass a per-scope value by calling `scope.autoResolve({ args })`
 * directly instead.
 *
 * The container the module is applied to is not a created scope — call
 * `container.autoResolve()` explicitly to eagerly resolve its own providers.
 */
export class AutoResolveModule implements IContainerModule {
  constructor(private readonly options: AutoResolveOptions = {}) {}

  applyTo(container: IContainer): void {
    container.onScopeCreated((scope) => scope.autoResolve(this.options));
  }
}
