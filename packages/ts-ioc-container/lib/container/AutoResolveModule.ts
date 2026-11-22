import { type IContainer, type IContainerModule } from './IContainer';
import { type WithArgs } from '../injector/IInjector';
import { GroupAliasToken } from '../token/GroupAliasToken';

/** Options of {@link AutoResolveModule}: `args` forwarded to every eagerly resolved provider. */
export type AutoResolveOptions = Partial<WithArgs>;

/**
 * The alias which marks a registration for eager resolution by
 * {@link AutoResolveModule}. Resolving it returns the eager dependencies of a scope.
 *
 * @example
 * @register(AutoResolveToken, singleton())
 * class Heartbeat {}
 */
export const AutoResolveToken = new GroupAliasToken<unknown>('AutoResolve');

/**
 * Enables eager resolution of the registrations bound to {@link AutoResolveToken}.
 *
 * A plain module over the container's own seams - an alias and the
 * `scopeCreated` event - so the core carries no auto-resolve state. Every scope
 * created after this module is applied resolves its own `AutoResolveToken`
 * group as part of `createScope`, so the instances exist before anyone asks for
 * them. The lookup is `shallow`: a provider registered in a parent scope is not
 * resolved again for every descendant. Child scopes inherit the subscription,
 * so a single `useModule` call on the root covers the whole scope tree.
 *
 * `options.args` are forwarded to every eagerly resolved provider of every such
 * scope. Pass a per-scope value by calling
 * `AutoResolveToken.resolve(scope, { args, shallow: true })` directly instead.
 *
 * The container the module is applied to is not a created scope - call
 * `AutoResolveToken.resolve(container)` to eagerly resolve its own providers.
 *
 * @example
 * const app = new Container({ tags: ['application'] })
 *   .useModule(new AutoResolveModule())
 *   .addRegistration(R.fromClass(Heartbeat));
 *
 * app.createScope({ tags: ['request'] }); // Heartbeat is constructed here
 */
export class AutoResolveModule implements IContainerModule {
  constructor(private readonly options: AutoResolveOptions = {}) {}

  /**
   * @throws {MethodNotImplementedError} when `container` is an `EmptyContainer`, which raises no scope events.
   */
  applyTo(container: IContainer): void {
    container.scopeCreated.subscribe((scope) => AutoResolveToken.resolve(scope, { ...this.options, shallow: true }));
  }
}
