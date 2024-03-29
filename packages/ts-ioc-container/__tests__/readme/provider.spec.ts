import 'reflect-metadata';
import { singleton, Container, Provider, MetadataInjector, tags } from '../../lib';

class Logger {}

describe('Provider', function () {
  it('can be registered as a function', function () {
    const container = new Container(new MetadataInjector()).register('ILogger', new Provider(() => new Logger()));

    expect(container.resolve('ILogger')).not.toBe(container.resolve('ILogger'));
  });

  it('can be registered as a value', function () {
    const container = new Container(new MetadataInjector()).register('ILogger', Provider.fromValue(new Logger()));

    expect(container.resolve('ILogger')).toBe(container.resolve('ILogger'));
  });

  it('can be registered as a class', function () {
    const container = new Container(new MetadataInjector()).register('ILogger', Provider.fromClass(Logger));

    expect(container.resolve('ILogger')).not.toBe(container.resolve('ILogger'));
  });

  it('can be featured by pipe method', function () {
    const root = new Container(new MetadataInjector(), { tags: ['root'] }).register(
      'ILogger',
      Provider.fromClass(Logger).pipe(
        singleton(),
        tags((s) => s.hasTag('root')),
      ),
    );

    expect(root.resolve('ILogger')).toBe(root.resolve('ILogger'));
  });
});
