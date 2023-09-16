import 'reflect-metadata';
import { Container, key, argsFn, args, ReflectionInjector, Registration } from '../lib';

@key('logger')
class Logger {
  constructor(public name: string, public type?: string) {}
}

describe('ArgsProvider', function () {
  function createContainer() {
    return new Container(new ReflectionInjector());
  }

  it('can assign argument function to provider', function () {
    const root = createContainer().use(Registration.fromClass(Logger).pipe(argsFn((container, ...args) => ['name'])));

    const logger = root.createScope().resolve<Logger>('logger');
    expect(logger.name).toBe('name');
  });

  it('can assign argument to provider', function () {
    const root = createContainer().use(Registration.fromClass(Logger).pipe(args('name')));

    const logger = root.resolve<Logger>('logger');
    expect(logger.name).toBe('name');
  });

  it('should set provider arguments with highest priority in compare to resolve arguments', function () {
    const root = createContainer().use(Registration.fromClass(Logger).pipe(args('name')));

    const logger = root.resolve<Logger>('logger', 'file');

    expect(logger.name).toBe('name');
    expect(logger.type).toBe('file');
  });
});
