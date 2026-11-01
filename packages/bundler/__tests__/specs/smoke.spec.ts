import { Container, type DependencyKey, type IContainer, type IContainerModule } from 'ts-ioc-container';
import { CommonBundle } from '../fixtures/app/src/di/common.bundle';
import { DevBundle } from '../fixtures/app/src/di/dev.bundle';
import { ProdBundle } from '../fixtures/app/src/di/prod.bundle';
import { TestBundle } from '../fixtures/app/src/di/test.bundle';

// `tic build` reads files and decorators, never `@inject`: a bundle missing a dependency builds without a warning.
// A smoke test applies the bundle the way the app does and resolves every key it registered.

/** Applies `bundle` to a fresh container and answers every key that failed to resolve, with its error. */
function smokeTest(bundle: IContainerModule): string[] {
  const root = new Container({ tags: ['application'] });
  const registered: Array<[IContainer, DependencyKey]> = [];
  // Subscribe before the bundle is applied; child scopes copy the listener, so it sees the whole tree.
  root.registered.subscribe((_provider, key, scope) => registered.push([scope, key]));

  root.useModule(bundle);
  // An app with scopes opens them here, as it does at runtime: root.createScope({ tags: ['request'] }), ...

  const failures: string[] = [];
  for (const [scope, key] of registered) {
    try {
      scope.resolve(key);
    } catch (e) {
      failures.push(`${String(key)}: ${(e as Error).message}`);
    }
  }
  return failures;
}

describe('Story: Smoke-test every bundle', () => {
  // Each environment is a different container: one passing says nothing about the others.
  it.each([
    ['prod', new ProdBundle()],
    ['dev', new DevBundle()],
    ['test', new TestBundle()],
  ])('the %s bundle resolves every class it registers', (_env, bundle) => {
    expect(smokeTest(bundle)).toEqual([]);
  });

  it('common.bundle.yml alone builds, but is not an app: Greeter needs an ILogger', () => {
    // `tic build common.bundle.yml` printed it without a warning
    expect(smokeTest(new CommonBundle())).toEqual([expect.stringMatching(/^Greeter: Cannot find ILogger/)]);
  });
});
