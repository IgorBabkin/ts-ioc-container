import { Container, type IContainer, Registration as R, SimpleInjector } from '../../lib';

/**
 * Command Pattern - Simple Injector
 *
 * The SimpleInjector passes the container itself as the first argument to the constructor.
 * This is useful for:
 * - Service Locators (like Command Dispatchers or Routers)
 * - Factory classes that need to resolve dependencies dynamically
 * - Legacy code migration where passing the container is common
 *
 * In this example, a CommandDispatcher uses the container to dynamically
 * resolve the correct handler for each command type.
 */

interface ICommand {
  type: string;
}

interface ICommandHandler {
  handle(command: ICommand): string;
}

class CreateUserCommand implements ICommand {
  readonly type = 'CreateUser';
  constructor(readonly username: string) {}
}

class CreateUserHandler implements ICommandHandler {
  handle(command: CreateUserCommand): string {
    return `User ${command.username} created`;
  }
}

describe('SimpleInjector', function () {
  it('should inject container to allow dynamic resolution (Service Locator pattern)', function () {
    // Dispatcher needs the container to find handlers dynamically based on command type
    class CommandDispatcher {
      constructor(private container: IContainer) {}

      dispatch(command: ICommand): string {
        // Dynamically resolve handler: "Handler" + "CreateUser"
        const handlerKey = `Handler${command.type}`;
        const handler = this.container.resolve<ICommandHandler>(handlerKey);
        return handler.handle(command);
      }
    }

    const container = new Container({ injector: new SimpleInjector() })
      .addRegistration(R.fromClass(CommandDispatcher).bindToKey('Dispatcher'))
      .addRegistration(R.fromClass(CreateUserHandler).bindToKey('HandlerCreateUser'));

    const dispatcher = container.resolve<CommandDispatcher>('Dispatcher');
    const result = dispatcher.dispatch(new CreateUserCommand('alice'));

    expect(result).toBe('User alice created');
  });

  it('should pass additional arguments alongside the container', function () {
    // Factory that creates widgets with a specific theme
    class WidgetFactory {
      constructor(
        private container: IContainer,
        private theme: string, // Passed as argument during resolve
      ) {}

      createWidget(name: string): string {
        return `Widget ${name} with ${this.theme} theme (Container available: ${!!this.container})`;
      }
    }

    const container = new Container({ injector: new SimpleInjector() }).addRegistration(
      R.fromClass(WidgetFactory).bindToKey('WidgetFactory'),
    );

    // Pass "dark" as the theme argument
    const factory = container.resolve<WidgetFactory>('WidgetFactory', { args: ['dark'] });

    expect(factory.createWidget('Button')).toBe('Widget Button with dark theme (Container available: true)');
  });
});
