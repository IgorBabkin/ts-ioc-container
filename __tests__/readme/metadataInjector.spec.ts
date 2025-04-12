import 'reflect-metadata';
import { Container, inject, Registration as R } from '../../lib';

class Logger {
  name = 'Logger';
}

class App {
  constructor(@inject('ILogger') private logger: Logger) {}

  // OR
  // constructor(@inject((container, ...args) => container.resolve('ILogger', ...args)) private logger: ILogger) {
  // }

  getLoggerName(): string {
    return this.logger.name;
  }
}

describe('Reflection Injector', function () {
  it('should inject dependencies by @inject decorator', function () {
    const container = new Container().addRegistration(R.fromClass(Logger).bindToKey('ILogger'));

    const app = container.resolveOne(App);

    expect(app.getLoggerName()).toBe('Logger');
  });
});
