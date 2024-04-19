import 'reflect-metadata';
import {
  IContainer,
  inject,
  singleton,
  Container,
  DependencyNotFoundError,
  key,
  provider,
  MetadataInjector,
  Registration as R,
  by,
  scope,
  register,
} from '../../lib';

@register(key('ILogger'), scope((s) => s.hasTag('child')), provider(singleton()))
class Logger {}

describe('Scopes', function () {
  it('should resolve dependencies from scope', function () {
    const root = new Container(new MetadataInjector(), { tags: ['root'] }).add(R.fromClass(Logger));
    const child = root.createScope('child');

    expect(child.resolve('ILogger')).toBe(child.resolve('ILogger'));
    expect(() => root.resolve('ILogger')).toThrow(DependencyNotFoundError);
  });

  it('should inject new scope', function () {
    const root = new Container(new MetadataInjector(), { tags: ['root'] });

    class App {
      constructor(@inject(by.scope.create('child')) public scope: IContainer) {}
    }

    const app = root.resolve(App);

    expect(app.scope).not.toBe(root);
    expect(app.scope.hasTag('child')).toBe(true);
  });
});
