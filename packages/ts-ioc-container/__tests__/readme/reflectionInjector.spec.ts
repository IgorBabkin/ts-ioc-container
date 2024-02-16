import 'reflect-metadata';
import { by, Container, inject, Provider, ReflectionInjector } from 'ts-ioc-container';

class Logger {
  name = 'Logger';
}

class App {
  constructor(@inject(by.key('ILogger')) private logger: Logger) {}

  // OR
  // constructor(@inject((container, ...args) => container.resolve('ILogger', ...args)) private logger: ILogger) {
  // }

  getLoggerName(): string {
    return this.logger.name;
  }
}

describe('Reflection Injector', function () {
  it('should inject dependencies by @inject decorator', function () {
    const container = new Container(new ReflectionInjector()).register('ILogger', Provider.fromClass(Logger));

    const app = container.resolve(App);

    expect(app.getLoggerName()).toBe('Logger');
  });
});
