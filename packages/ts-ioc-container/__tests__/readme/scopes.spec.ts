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
    const root = new Container(new ReflectionInjector(), { tags: ['root'] }).add(Registration.fromClass(Logger));
    const child = root.createScope('child');

    expect(child.resolve('ILogger')).toBe(child.resolve('ILogger'));
    expect(() => root.resolve('ILogger')).toThrow(DependencyNotFoundError);
  });
});
