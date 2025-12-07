import 'reflect-metadata';
import { Container, hook, HooksRunner, injectProp, Registration } from '../../lib';

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
    // Runner for the 'onInit' lifecycle hook
    const onInitHookRunner = new HooksRunner('onInit');

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

    // 2. Run lifecycle hooks to inject properties
    onInitHookRunner.execute(viewModel, { scope: container });

    expect(viewModel.greetingService).toBe('Hello');
    expect(viewModel.display()).toBe('Hello User');
  });
});
