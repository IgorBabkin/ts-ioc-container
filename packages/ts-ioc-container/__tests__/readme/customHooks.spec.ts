import { append, Container, hook, SequentialSyncHookExecutionStrategy, type HookFn } from '../../lib';

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
 * 1. Pick a HookExecutionStrategy, keyed with a unique hook name
 * 2. Create methods decorated with @hook('hookName', append(executor))
 * 3. Run the strategy from the container's injector via onConstructed
 * 4. Methods are automatically called when instances are created
 */

// A strategy for the custom 'initialize' hooks: sync, in declaration order
const initializeStrategy = new SequentialSyncHookExecutionStrategy({ key: 'initialize' });

// Hook executor - defines what happens when the hook fires
const executeInitialize: HookFn = (ctx) => {
  ctx.invokeMethod({ args: ctx.resolveArgs() });
};

describe('Custom Hooks', () => {
  it('should execute custom initialization hook after construction', () => {
    class CacheService {
      isWarmedUp = false;

      // Custom hook - called automatically after construction
      @hook('initialize', append(executeInitialize))
      warmCache() {
        this.isWarmedUp = true;
      }
    }

    const container = new Container({ tags: ['application'] });

    // Construction is the injector's event, so custom construct hooks go on the injector
    container.getInjector().onConstructed((instance, scope) => {
      // Run all 'initialize' hooks on newly created instances
      initializeStrategy.execute(instance, { scope });
    });

    const cacheService = container.resolve(CacheService);

    // Hook was automatically executed
    expect(cacheService.isWarmedUp).toBe(true);
  });
});
