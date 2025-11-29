import { SingleToken, Container, inject, Registration as R } from '../../lib';

interface ILogger {
  log(message: string): void;
}

const ILoggerKey = new SingleToken<ILogger>('ILogger');

class Logger implements ILogger {
  log(message: string) {
    console.log(message);
  }
}

class App {
  constructor(@inject(ILoggerKey) public logger: ILogger) {}
}

describe('SingleToken', function () {
  it('should resolve using SingleToken', function () {
    const container = new Container().addRegistration(R.fromClass(Logger).bindToKey('ILogger'));

    const app = container.resolve(App);
    app.logger.log('Hello');
    expect(app.logger).toBeInstanceOf(Logger);
    expect(app.logger).toBeDefined();
  });
});
