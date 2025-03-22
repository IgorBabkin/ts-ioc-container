import 'reflect-metadata';
import { by, Container, inject, Registration as R } from '../../lib';

class Logger {
  name = 'Logger';
}

class App {
  constructor(@inject(by.one('ILogger')) private logger: Logger) {}

  // OR
  // constructor(@inject((container, ...args) => container.resolve('ILogger', ...args)) private logger: ILogger) {
  // }

  getLoggerName(): string {
    return this.logger.name;
  }
}

describe('Reflection Injector', function () {
  it('should inject dependencies by @inject decorator', function () {
    const container = new Container().addRegistration(R.fromClass(Logger).assignToKey('ILogger'));

    const app = container.resolve(App);

    expect(app.getLoggerName()).toBe('Logger');
  });
});
