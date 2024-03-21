import 'reflect-metadata';
import {
  IContainer,
  inject,
  singleton,
  Container,
  DependencyNotFoundError,
  key,
  tags,
  provider,
  MetadataInjector,
  Registration as R,
  by,
} from '../../lib';

@key('ILogger')
@provider(singleton(), tags('child'))
class Logger {}

describe('Scopes', function () {
  it('should resolve dependencies from scope', function () {
    const root = new Container(new MetadataInjector(), { tags: ['root'] }).use(R.fromClass(Logger));
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
