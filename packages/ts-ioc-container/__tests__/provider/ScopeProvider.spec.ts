import { bindTo, Container, register, Registration as R, scope, singleton } from '../../lib';

/**
 * Scoping - Scope Match Rule
 *
 * You can restrict WHERE a provider is registered.
 * This is useful for singleton services that should only exist in the root scope,
 * or per-request services that should only exist in request scopes.
 */

describe('ScopeProvider', function () {
  it('should register provider only in matching scope', function () {
    // SharedState should be a singleton in the root 'application' scope
    // It will be visible to all child scopes, but physically resides in 'application'
    @register(
      bindTo('SharedState'),
      scope((s) => s.hasTag('application')), // Only register in application scope
      singleton(), // One instance per application
    )
    class SharedState {
      data = 'shared';
    }

    const appContainer = new Container({ tags: ['application'] }).addRegistration(R.fromClass(SharedState));
    const requestScope = appContainer.createScope({ tags: ['request'] });

    // Both resolve to the SAME instance because it's a singleton in the app scope
    const appState = appContainer.resolve('SharedState');
    const requestState = requestScope.resolve('SharedState');

    expect(appState).toBe(requestState);
  });
});
