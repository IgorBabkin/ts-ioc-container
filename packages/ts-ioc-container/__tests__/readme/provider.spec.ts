import 'reflect-metadata';
import { singleton, Container, tags, Provider, ReflectionInjector } from 'ts-ioc-container';

class Logger {}

describe('Provider', function () {
  it('can be registered as a function', function () {
    const container = new Container(new ReflectionInjector()).register('logger', new Provider(() => new Logger()));

    expect(container.resolve('logger')).not.toBe(container.resolve('logger'));
  });

  it('can be registered as a value', function () {
    const container = new Container(new ReflectionInjector()).register('logger', Provider.fromValue(new Logger()));

    expect(container.resolve('logger')).toBe(container.resolve('logger'));
  });

  it('can be registered as a class', function () {
    const container = new Container(new ReflectionInjector()).register('logger', Provider.fromClass(Logger));

    expect(container.resolve('logger')).not.toBe(container.resolve('logger'));
  });

  it('can be featured by pipe method', function () {
    const root = new Container(new ReflectionInjector(), { tags: ['root'] }).register(
      'logger',
      Provider.fromClass(Logger).pipe(singleton(), tags('root')),
    );

    expect(root.resolve('logger')).toBe(root.resolve('logger'));
  });
});
