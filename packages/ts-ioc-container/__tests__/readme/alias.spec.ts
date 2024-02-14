import 'reflect-metadata';
import { alias, bySomeAlias, Container, inject, Provider, provider, ReflectionInjector } from '../../lib';

describe('alias', () => {
  it('should create an alias', () => {
    interface ILogger {
      name: string;
    }

    @provider(alias('ILogger'))
    class FileLogger implements ILogger {
      name = 'FileLogger';
    }

    @provider(alias('ILogger'))
    class DbLogger implements ILogger {
      name = 'DbLogger';
    }

    class App {
      constructor(@inject(bySomeAlias('ILogger')) public loggers: ILogger[]) {}
    }

    const container = new Container(new ReflectionInjector())
      .register('IFileLogger', Provider.fromClass(FileLogger))
      .register('IDbLogger', Provider.fromClass(DbLogger));

    const app = container.resolve(App);

    expect(app.loggers[0]).toBeInstanceOf(FileLogger);
    expect(app.loggers[1]).toBeInstanceOf(DbLogger);
  });
});
