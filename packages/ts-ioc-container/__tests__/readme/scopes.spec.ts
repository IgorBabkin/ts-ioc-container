import 'reflect-metadata';
import {
  singleton,
  Container,
  DependencyNotFoundError,
  key,
  tags,
  provider,
  ReflectionInjector,
  Registration,
} from 'ts-ioc-container';

@key('ILogger')
@provider(singleton(), tags('child'))
class Logger {}

describe('Scopes', function () {
  it('should resolve dependencies from scope', function () {
    const container = new Container(new ReflectionInjector(), { tags: ['root'] }).add(Registration.fromClass(Logger));
    const scope = container.createScope(['child']);

    expect(scope.resolve('ILogger')).toBe(scope.resolve('ILogger'));
    expect(() => container.resolve('ILogger')).toThrow(DependencyNotFoundError);
  });
});
