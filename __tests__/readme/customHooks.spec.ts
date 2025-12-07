import { Container, hook, HooksRunner, type HookFn } from '../../lib';

/**
 * User Management Domain - Custom Lifecycle Hooks
 *
 * Custom hooks extend the container's lifecycle management beyond
 * the built-in @onConstruct and @onDispose hooks.
 *
 * Use cases:
 * - @validateConfig: Validate service configuration after construction
 * - @warmCache: Pre-populate caches when service is created
 * - @registerMetrics: Register service with monitoring system
 * - @auditCreation: Log service creation for compliance
 *
 * How it works:
 * 1. Define a HooksRunner with a unique hook name
 * 2. Create methods decorated with @hook('hookName', executor)
 * 3. Register the hook runner via addOnConstructHook
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
      @hook('initialize', executeInitialize)
      warmCache() {
        this.isWarmedUp = true;
      }
    }

    const container = new Container({ tags: ['application'] }).addOnConstructHook((instance, scope) => {
      // Run all 'initialize' hooks on newly created instances
      initializeHookRunner.execute(instance, { scope });
    });

    const cacheService = container.resolve(CacheService);

    // Hook was automatically executed
    expect(cacheService.isWarmedUp).toBe(true);
  });
});
