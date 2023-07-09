import 'reflect-metadata';
import { Container, forKey, withArgsFn, withArgs, ReflectionInjector, Registration } from 'ts-ioc-container';

@forKey('logger')
class Logger {
  constructor(public name: string, public type?: string) {}
}

describe('ArgsProvider', function () {
  function createContainer() {
    return new Container(new ReflectionInjector());
  }

  it('can assign argument function to provider', function () {
    const root = createContainer().add(
      Registration.fromClass(Logger).pipe(withArgsFn((container, ...args) => ['name'])),
    );

    const logger = root.resolve<Logger>('logger');
    expect(logger.name).toBe('name');
  });

  it('can assign argument to provider', function () {
    const root = createContainer().add(Registration.fromClass(Logger).pipe(withArgs('name')));

    const logger = root.resolve<Logger>('logger');
    expect(logger.name).toBe('name');
  });

  it('should set provider arguments with highest priority in compare to resolve arguments', function () {
    const root = createContainer().add(Registration.fromClass(Logger).pipe(withArgs('name')));

    const logger = root.resolve<Logger>('logger', 'file');

    expect(logger.name).toBe('name');
    expect(logger.type).toBe('file');
  });
});
