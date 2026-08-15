import { bindTo, Container, type IContainer, register, Registration as R, SimpleInjector } from '../../lib';

@register(bindTo('HandlerCreateUser'))
class CreateUserHandler {
  handle(username: string): string {
    return `User ${username} created`;
  }
}

describe('SimpleInjector', function () {
  it('should inject container to allow dynamic resolution', function () {
    @register(bindTo('Dispatcher'))
    class CommandDispatcher {
      constructor(private container: IContainer) {}

      dispatch(type: string, payload: string): string {
        const handler = this.container.resolve<CreateUserHandler>(`Handler${type}`);
        return handler.handle(payload);
      }
    }

    const container = new Container({ injector: new SimpleInjector() })
      .addRegistration(R.fromClass(CommandDispatcher))
      .addRegistration(R.fromClass(CreateUserHandler));

    const dispatcher = container.resolve<CommandDispatcher>('Dispatcher');

    expect(dispatcher.dispatch('CreateUser', 'alice')).toBe('User alice created');
  });

  it('should pass additional arguments alongside the container', function () {
    class WidgetFactory {
      constructor(
        private container: IContainer,
        private theme: string,
      ) {}

      createWidget(name: string): string {
        return `Widget ${name} with ${this.theme} theme (container: ${!!this.container})`;
      }
    }

    const container = new Container({ injector: new SimpleInjector() }).addRegistration(R.fromClass(WidgetFactory));

    const factory = container.resolve<WidgetFactory>('WidgetFactory', { args: ['dark'] });

    expect(factory.createWidget('Button')).toBe('Widget Button with dark theme (container: true)');
  });
});
