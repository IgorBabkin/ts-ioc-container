import 'reflect-metadata';
import {
  asSingleton,
  Container,
  DependencyNotFoundError,
  forKey,
  perTags,
  provider,
  ReflectionInjector,
  Registration,
} from 'ts-ioc-container';

@forKey('ILogger')
@provider(asSingleton(), perTags('child'))
class Logger {}

describe('Scopes', function () {
  it('should resolve dependencies from scope', function () {
    const container = new Container(new ReflectionInjector(), { tags: ['root'] }).add(Registration.fromClass(Logger));
    const scope = container.createScope(['child']);

    expect(scope.resolve('ILogger')).toBe(scope.resolve('ILogger'));
    expect(() => container.resolve('ILogger')).toThrow(DependencyNotFoundError);
  });
});
