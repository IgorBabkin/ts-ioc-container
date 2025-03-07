import 'reflect-metadata';
import { Container } from '../../lib/container/Container';
import { IContainer } from '../../lib/container/IContainer';
import {
  hook,
  onConstruct,
  onDispose,
  runOnConstructHooks,
  runOnDisposeHooks,
  injectProp,
  runHooks,
} from '../../lib/hooks/hook';
import { SimpleInjector } from '../../lib/injector/SimpleInjector';
import { IHookContext } from '../../lib/hooks/HookContext';

describe('hook', () => {
  let container: IContainer;

  beforeEach(() => {
    container = new Container(new SimpleInjector());
  });

  describe('injectProp', () => {
    it('should inject property with explicit name', () => {
      // Create a class with a property to inject
      class TestClass {
        injectedValue: string = '';
      }

      // Create an instance
      const instance = new TestClass();

      // Create a hook function with injectProp
      const hookFn = injectProp((scope) => 'injected value', 'injectedValue');

      // Run the hook function
      hookFn({
        instance,
        scope: container,
        setProperty: jest.fn(),
        resolveArgs: () => [],
        invokeMethod: () => undefined,
        getProperty: () => undefined,
      } as IHookContext);

      // Verify the property was injected
      expect(instance.injectedValue).toBe('injected value');
    });

    it('should inject property using setProperty when no name provided', () => {
      // Create a class
      class TestClass {}

      // Create an instance
      const instance = new TestClass();

      // Mock setProperty function
      const setProperty = jest.fn();

      // Create a hook function with injectProp without property name
      const hookFn = injectProp((scope: IContainer) => 'injected value');

      // Run the hook function
      hookFn({
        instance,
        scope: container,
        setProperty,
        resolveArgs: () => [],
        invokeMethod: () => undefined,
        getProperty: () => undefined,
      } as IHookContext);

      // Verify setProperty was called with the injected value function
      expect(setProperty).toHaveBeenCalled();
      // We can't directly compare functions, so just verify it was called
    });
  });

  describe('onConstruct and onDispose', () => {
    it('should run onConstruct hooks', () => {
      // Create a class with onConstruct hook
      class TestClass {
        constructCalled = false;

        // Method to hook into
        constructor() {}
      }

      // Add onConstruct hook
      onConstruct((context: IHookContext) => {
        (context.instance as any).constructCalled = true;
      })(TestClass.prototype, 'constructor');

      // Create an instance
      const instance = new TestClass();

      // Run onConstruct hooks
      runOnConstructHooks(instance, container);

      // Verify the hook was executed
      expect(instance.constructCalled).toBe(true);
    });

    it('should run onDispose hooks with custom hook', () => {
      // Create a class with a method to be called on dispose
      class TestClass {
        disposeCalled = false;

        dispose() {
          this.disposeCalled = true;
        }
      }

      // Add onDispose hook
      hook('onDispose', (context: IHookContext) => {
        context.invokeMethod({});
      })(TestClass.prototype, 'dispose');

      // Create an instance
      const instance = new TestClass();

      // Run onDispose hooks
      runOnDisposeHooks(instance, container);

      // Verify the dispose method was called
      expect(instance.disposeCalled).toBe(true);
    });

    it('should run onDispose hooks with exported onDispose function', () => {
      // Create a class with a method to be called on dispose
      class TestClass {
        disposeCalled = false;

        dispose() {
          this.disposeCalled = true;
        }
      }

      // Use the exported onDispose function directly
      // This will test line 102 in hook.ts
      onDispose(TestClass.prototype, 'dispose');

      // Create an instance
      const instance = new TestClass();

      // Run onDispose hooks
      runOnDisposeHooks(instance, container);

      // Verify the dispose method was called
      expect(instance.disposeCalled).toBe(true);
    });
  });

  describe('hook', () => {
    it('should add multiple hooks to a class', () => {
      // Create a class
      class TestClass {
        hook1Called = false;
        hook2Called = false;

        // Add the custom method to the class
        customMethod() {}
      }

      // Define a property to hook into
      const methodName = 'customMethod';

      // Add hooks
      hook(
        'customHook',
        (context: IHookContext) => {
          (context.instance as any).hook1Called = true;
        },
        (context: IHookContext) => {
          (context.instance as any).hook2Called = true;
        },
      )(TestClass.prototype, methodName);

      // Create an instance
      const instance = new TestClass();

      // Run the hooks manually
      runHooks(instance, 'customHook', {
        scope: container,
        predicate: () => true,
      });

      // Verify both hooks were executed
      expect(instance.hook1Called).toBe(true);
      expect(instance.hook2Called).toBe(true);
    });

    it('should handle hook class constructors', () => {
      // Create a hook class
      class TestHookClass {
        execute(context: IHookContext) {
          (context.instance as any).hookClassCalled = true;
        }
      }

      // Create a target class
      class TestClass {
        hookClassCalled = false;

        // Add the custom method to the class
        customMethod() {}
      }

      // Define a property to hook into
      const methodName = 'customMethod';

      // Add hook using the hook class
      hook('customHook', TestHookClass)(TestClass.prototype, methodName);

      // Create an instance
      const instance = new TestClass();

      // Run the hooks manually
      runHooks(instance, 'customHook', {
        scope: container,
        predicate: () => true,
      });

      // Verify the hook class was executed
      expect(instance.hookClassCalled).toBe(true);
    });
  });
});
