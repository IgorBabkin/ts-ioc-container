import { bindTo, Container, inject, register, Registration as R, singleton, SingleToken } from '../../lib';

interface ILogger {
  log(message: string): void;
}

const ILoggerToken = new SingleToken<ILogger>('ILogger');

@register(bindTo(ILoggerToken), singleton())
class Logger implements ILogger {
  log(message: string) {
    console.log(message);
  }
}

class App {
  constructor(@inject(ILoggerToken) private logger: ILogger) {}
  start() {
    this.logger.log('hello');
  }
}

describe('Quickstart', function () {
  it('should resolve App with injected Logger', function () {
    const container = new Container({ tags: ['application'] }).addRegistration(R.fromClass(Logger));

    const app = container.resolve(App);
    app.start();

    expect(app).toBeInstanceOf(App);
  });
});
