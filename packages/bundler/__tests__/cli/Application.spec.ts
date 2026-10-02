import { It, Mock, Times } from 'moq.ts';
import { type IContainer, invoke } from 'ts-ioc-container';
import {
  Application,
  type IErrorHandler,
  MissingCommandError,
  onDefault,
  UnknownActionError,
  UnknownCommandError,
} from '../../lib';

class Greeter {
  readonly calls: unknown[][] = [];

  @onDefault(invoke)
  greet(...args: unknown[]): void {
    this.calls.push(args);
  }
}

const errorHandler = () => new Mock<IErrorHandler>().setup((m) => m.handleError(It.IsAny())).returns(1);

const container = (handler: IErrorHandler, controllers: Record<string, object> = {}) => {
  const mock = new Mock<IContainer>()
    .setup((c) => c.resolve('IErrorHandler', It.IsAny()))
    .returns(handler)
    .setup((c) => c.hasRegistration(It.IsAny()))
    .callback(({ args: [key] }) => key in controllers)
    .setup((c) => c.dispose())
    .returns(undefined);
  for (const [key, controller] of Object.entries(controllers)) mock.setup((c) => c.resolve(key)).returns(controller);
  return mock;
};

describe('Application', () => {
  it('given no command when run then it reports MissingCommandError and returns the handler exit code', () => {
    const handler = errorHandler();
    const scope = container(handler.object());

    const code = Application.bootstrap(scope.object()).run();

    expect(code).toBe(1);
    handler.verify((m) => m.handleError(It.Is((e) => e instanceof MissingCommandError)), Times.Once());
    scope.verify((c) => c.dispose(), Times.Once());
  });

  it('given a command no controller is registered for when run then it reports UnknownCommandError', () => {
    const handler = errorHandler();
    const scope = container(handler.object());

    Application.bootstrap(scope.object()).run('compile');

    handler.verify((m) => m.handleError(It.Is((e) => e instanceof UnknownCommandError)), Times.Once());
    scope.verify((c) => c.resolve('compile'), Times.Never());
  });

  it('given a command when run then the default action runs with the raw command line and exits 0', () => {
    const handler = errorHandler();
    const greeter = new Greeter();
    const scope = container(handler.object(), { greet: greeter });

    const code = Application.bootstrap(scope.object()).run('greet', '--loud');

    expect(code).toBe(0);
    expect(greeter.calls).toHaveLength(1);
    handler.verify((m) => m.handleError(It.IsAny()), Times.Never());
    scope.verify((c) => c.dispose(), Times.Once());
  });

  it('given a help flag in the command position when run then it runs the help command', () => {
    const greeter = new Greeter();
    const scope = container(errorHandler().object(), { help: greeter });

    expect(Application.bootstrap(scope.object()).run('--help')).toBe(0);
    expect(greeter.calls).toHaveLength(1);
  });

  it('given an action the controller does not declare when run then it reports UnknownActionError', () => {
    const handler = errorHandler();
    const scope = container(handler.object(), { greet: new Greeter() });

    Application.bootstrap(scope.object()).run('greet', 'loudly');

    handler.verify((m) => m.handleError(It.Is((e) => e instanceof UnknownActionError)), Times.Once());
  });

  it('given an action that throws when run then the error reaches the handler and the scope is still disposed', () => {
    const boom = new Error('boom');
    class Failing {
      @onDefault(invoke)
      fail(): void {
        throw boom;
      }
    }
    const handler = errorHandler();
    const scope = container(handler.object(), { fail: new Failing() });

    expect(Application.bootstrap(scope.object()).run('fail')).toBe(1);
    handler.verify((m) => m.handleError(boom), Times.Once());
    scope.verify((c) => c.dispose(), Times.Once());
  });
});
