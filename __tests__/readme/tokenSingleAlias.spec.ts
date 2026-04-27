import { bindTo, Container, inject, register, Registration as R, SingleAliasToken, toSingleAlias } from '../../lib';

const ILoggerToken = new SingleAliasToken<ILogger>('ILogger');

interface ILogger {
  log(message: string): void;
}

@register(bindTo('ConsoleLogger'), bindTo(toSingleAlias('ILogger')))
class ConsoleLogger implements ILogger {
  log(message: string) {
    console.log(message);
  }
}

@register(bindTo('FileLogger'), bindTo(toSingleAlias('ILogger')))
class FileLogger implements ILogger {
  log(message: string) {
    // Write to file
  }
}

class App {
  constructor(@inject(ILoggerToken) public logger: ILogger) {}

  run() {
    this.logger.log('Hello'); // Uses one of the registered loggers
  }
}

describe('SingleAliasToken', function () {
  it('should resolve single implementation by alias', function () {
    const container = new Container()
      .addRegistration(R.fromClass(ConsoleLogger))
      .addRegistration(R.fromClass(FileLogger));

    const app = container.resolve(App);
    app.run();
    expect(app.logger).toBeDefined();
    expect(app.logger.log).toBeDefined();
  });

  it('should support toSingleAlias helper', function () {
    const ILoggerToken2 = toSingleAlias<ILogger>('ILogger');
    expect(ILoggerToken2).toBeDefined();
  });
});
