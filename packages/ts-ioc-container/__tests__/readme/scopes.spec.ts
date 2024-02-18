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
  by,
} from '../../lib';
import { IContainer, inject } from 'ts-ioc-container';

@key('ILogger')
@provider(singleton(), tags('child'))
class Logger {}

describe('Scopes', function () {
  it('should resolve dependencies from scope', function () {
    const root = new Container(new ReflectionInjector(), { tags: ['root'] }).use(Registration.fromClass(Logger));
    const child = root.createScope('child');

    expect(child.resolve('ILogger')).toBe(child.resolve('ILogger'));
    expect(() => root.resolve('ILogger')).toThrow(DependencyNotFoundError);
  });

  it('should inject current scope', function () {
    const root = new Container(new ReflectionInjector(), { tags: ['root'] }).use(Registration.fromClass(Logger));

    class App {
      constructor(@inject(by.currentScope) public scope: IContainer) {}
    }

    const app = root.resolve(App);

    expect(app.scope).toBe(root);
  });

  it('should inject new scope', function () {
    const root = new Container(new ReflectionInjector(), { tags: ['root'] }).use(Registration.fromClass(Logger));

    class App {
      constructor(@inject(by.createScope('child')) public scope: IContainer) {}
    }

    const app = root.resolve(App);

    expect(app.scope).not.toBe(root);
    expect(app.scope.hasTag('child')).toBe(true);
  });
});
