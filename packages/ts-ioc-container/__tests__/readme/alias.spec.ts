import 'reflect-metadata';
import { alias, by, Container, inject, Provider, provider, ReflectionInjector } from '../../lib';

describe('alias', () => {
  interface ILogger {
    name: string;
  }

  @provider(alias('ILogger', 'a'))
  class FileLogger implements ILogger {
    name = 'FileLogger';
  }

  @provider(alias('ILogger', 'b'))
  class DbLogger implements ILogger {
    name = 'DbLogger';
  }

  it('should resolve by some alias', () => {
    class App {
      constructor(@inject(by.alias.some('ILogger')) public loggers: ILogger[]) {}
    }

    const container = new Container(new ReflectionInjector())
      .register('IFileLogger', Provider.fromClass(FileLogger))
      .register('IDbLogger', Provider.fromClass(DbLogger));

    const app = container.resolve(App);

    expect(app.loggers[0]).toBeInstanceOf(FileLogger);
    expect(app.loggers[1]).toBeInstanceOf(DbLogger);
  });

  it('should resolve by all alias', () => {
    class App {
      constructor(@inject(by.alias.all('ILogger', 'a')) public loggers: ILogger[]) {}
    }

    const container = new Container(new ReflectionInjector())
      .register('IFileLogger', Provider.fromClass(FileLogger))
      .register('IDbLogger', Provider.fromClass(DbLogger));

    const app = container.resolve(App);

    expect(app.loggers).toHaveLength(1);
    expect(app.loggers[0]).toBeInstanceOf(FileLogger);
  });
});
