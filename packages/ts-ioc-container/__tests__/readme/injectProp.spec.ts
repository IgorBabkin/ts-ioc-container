import 'reflect-metadata';
import { Container, hook, HookCollector, injectProp, Registration, sequential, toTask } from '../../lib';

/**
 * UI Components - Property Injection
 *
 * Property injection is useful when you don't control the class instantiation
 * (like in some UI frameworks, Web Components, or legacy systems) or when
 * you want to avoid massive constructors in base classes.
 *
 * This example demonstrates a ViewModel that gets dependencies injected
 * AFTER construction via an initialization hook.
 */

describe('inject property', () => {
  it('should inject property', () => {
    // Collector for the 'onInit' lifecycle hook
    const onInit = new HookCollector({ key: 'onInit' });

    class UserViewModel {
      // Inject 'GreetingService' into 'greeting' property during 'onInit'
      @hook('onInit', injectProp('GreetingService'))
      greetingService!: string;

      display(): string {
        return `${this.greetingService} User`;
      }
    }

    const container = new Container().addRegistration(Registration.fromValue('Hello').bindToKey('GreetingService'));

    // 1. Create instance (dependencies not yet injected)
    const viewModel = container.resolve(UserViewModel);

    // 2. Collect the lifecycle hooks and run them to inject properties
    onInit
      .getActions(viewModel, { scope: container })
      .map(toTask)
      .forEach((task) => task());

    expect(viewModel.greetingService).toBe('Hello');
    expect(viewModel.display()).toBe('Hello User');
  });

  it('should read the applied instance property via getProperty', () => {
    const onInit = new HookCollector({ key: 'onInit' });

    let injectedValue: unknown;

    class UserViewModel {
      @hook(
        'onInit',
        sequential(injectProp('GreetingService'), (context) => {
          injectedValue = context.getProperty();
        }),
      )
      greetingService!: string;
    }

    const container = new Container().addRegistration(Registration.fromValue('Hello').bindToKey('GreetingService'));

    const viewModel = container.resolve(UserViewModel);
    onInit
      .getActions(viewModel, { scope: container })
      .map(toTask)
      .forEach((task) => task());

    expect(injectedValue).toBe('Hello');
  });
});
