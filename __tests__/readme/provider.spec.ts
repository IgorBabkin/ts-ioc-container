import 'reflect-metadata';
import { singleton, Container, Provider, scope } from '../../lib';

class Logger {}

describe('Provider', function () {
  it('can be registered as a function', function () {
    const container = new Container().register('ILogger', new Provider(() => new Logger()));

    expect(container.resolve('ILogger')).not.toBe(container.resolve('ILogger'));
  });

  it('can be registered as a value', function () {
    const container = new Container().register('ILogger', Provider.fromValue(new Logger()));

    expect(container.resolve('ILogger')).toBe(container.resolve('ILogger'));
  });

  it('can be registered as a class', function () {
    const container = new Container().register('ILogger', Provider.fromClass(Logger));

    expect(container.resolve('ILogger')).not.toBe(container.resolve('ILogger'));
  });

  it('can be featured by pipe method', function () {
    const root = new Container({ tags: ['root'] }).register('ILogger', Provider.fromClass(Logger).pipe(singleton()));

    expect(root.resolve('ILogger')).toBe(root.resolve('ILogger'));
  });
});
