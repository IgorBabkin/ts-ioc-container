import 'reflect-metadata';
import {
  by,
  Container,
  DependencyNotFoundError,
  IContainer,
  inject,
  key,
  MetadataInjector,
  provider,
  register,
  Registration as R,
  scope,
  singleton,
} from '../../lib';

@register(key('ILogger'), scope((s) => s.hasTag('child')))
@provider(singleton())
class Logger {}

describe('Scopes', function () {
  it('should resolve dependencies from scope', function () {
    const root = new Container(new MetadataInjector(), { tags: ['root'] }).add(R.toClass(Logger));
    const child = root.createScope({ tags: ['child'] });

    expect(child.resolve('ILogger')).toBe(child.resolve('ILogger'));
    expect(() => root.resolve('ILogger')).toThrow(DependencyNotFoundError);
  });

  it('should inject new scope', function () {
    const root = new Container(new MetadataInjector(), { tags: ['root'] });

    class App {
      constructor(@inject(by.scope.create({ tags: ['child'] })) public scope: IContainer) {}
    }

    const app = root.resolve(App);

    expect(app.scope).not.toBe(root);
    expect(app.scope.hasTag('child')).toBe(true);
  });
});
