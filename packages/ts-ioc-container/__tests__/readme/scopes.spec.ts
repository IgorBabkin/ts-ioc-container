import 'reflect-metadata';
import {
  asSingleton,
  perTags,
  Container,
  Provider,
  ReflectionInjector,
  DependencyNotFoundError,
} from 'ts-ioc-container';

class Logger {}

describe('Scopes', function () {
  it('should resolve dependencies from scope', function () {
    const container = new Container(new ReflectionInjector(), { tags: ['root'] }).register(
      'ILogger',
      Provider.fromClass(Logger).pipe(asSingleton(), perTags('child')),
    );

    const scope = container.createScope(['child']);

    expect(scope.resolve('ILogger')).toBe(scope.resolve('ILogger'));
    expect(() => container.resolve('ILogger')).toThrow(DependencyNotFoundError);
  });
});
