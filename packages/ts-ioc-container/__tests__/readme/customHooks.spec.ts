import { append, Container, hook, HooksRunner, MetadataInjector, type HookFn } from '../../lib';

/**
 * User Management Domain - Custom Lifecycle Hooks
 *
 * Custom hooks extend the container's lifecycle management beyond
 * the built-in @onConstruct and @onContainerDisposed hooks.
 *
 * Use cases:
 * - @validateConfig: Validate service configuration after construction
 * - @warmCache: Pre-populate caches when service is created
 * - @registerMetrics: Register service with monitoring system
 * - @auditCreation: Log service creation for compliance
 *
 * How it works:
 * 1. Define a HooksRunner with a unique hook name
 * 2. Create methods decorated with @hook('hookName', append(executor))
 * 3. Register the hook runner on an injector via onConstructed, then pass it to the container
 * 4. Methods are automatically called when instances are created
 */

// Create a custom hook runner for initialization
const initializeHookRunner = new HooksRunner('initialize');

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

    // Construction is the injector's event, so custom construct hooks go on the injector
    const injector = new MetadataInjector().onConstructed((instance, scope) => {
      // Run all 'initialize' hooks on newly created instances
      initializeHookRunner.execute(instance, { scope });
    });

    const container = new Container({ injector, tags: ['application'] });

    const cacheService = container.resolve(CacheService);

    // Hook was automatically executed
    expect(cacheService.isWarmedUp).toBe(true);
  });
});
