import { Container, hook, HookCollector, type HookFn, runInOrder, toTask } from '../../lib';

/**
 * User Management Domain - Custom Lifecycle Hooks
 *
 * Custom hooks extend the container's lifecycle management beyond
 * the built-in @onConstruct and @onScopeDisposed hooks.
 *
 * Use cases:
 * - @validateConfig: Validate service configuration after construction
 * - @warmCache: Pre-populate caches when service is created
 * - @registerMetrics: Register service with monitoring system
 * - @auditCreation: Log service creation for compliance
 *
 * How it works:
 * 1. Create a HookCollector, keyed with a unique hook name
 * 2. Create methods decorated with @hook('hookName', executor)
 * 3. Collect the hooks from the container's injector via onConstructed, and run them
 * 4. Methods are automatically called when instances are created
 */

// A collector for the custom 'initialize' hooks
const initialize = new HookCollector({ key: 'initialize' });

// Hook executor - defines what happens when the hook fires
const executeInitialize: HookFn = (ctx) => {
  ctx.invokeMethod({ args: ctx.resolveArgs() });
};

describe('Custom Hooks', () => {
  it('should execute custom initialization hook after construction', () => {
    class CacheService {
      isWarmedUp = false;

      // Custom hook - called automatically after construction
      @hook('initialize', executeInitialize)
      warmCache() {
        this.isWarmedUp = true;
      }
    }

    const container = new Container({ tags: ['application'] });

    // Construction is the injector's event, so custom construct hooks go on the injector
    container.getInjector().onConstructed((instance, scope) => {
      // Collect all 'initialize' hooks of newly created instances, and run them in order
      runInOrder(initialize.getActions(instance, { scope }).map(toTask));
    });

    const cacheService = container.resolve(CacheService);

    // Hook was automatically executed
    expect(cacheService.isWarmedUp).toBe(true);
  });
});
