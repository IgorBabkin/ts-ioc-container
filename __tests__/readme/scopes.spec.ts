import {
  asKey,
  by,
  Container,
  DependencyNotFoundError,
  type IContainer,
  inject,
  register,
  Registration as R,
  scope,
  singleton,
} from '../../lib';

@register(asKey('ILogger'), scope((s) => s.hasTag('child')), singleton())
class Logger {}

describe('Scopes', function () {
  it('should resolve dependencies from scope', function () {
    const root = new Container({ tags: ['root'] }).addRegistration(R.fromClass(Logger));
    const child = root.createScope({ tags: ['child'] });

    expect(child.resolveOne('ILogger')).toBe(child.resolveOne('ILogger'));
    expect(() => root.resolveOne('ILogger')).toThrow(DependencyNotFoundError);
  });

  it('should inject new scope', function () {
    const root = new Container({ tags: ['root'] });

    class App {
      constructor(@inject(by.scope.create({ tags: ['child'] })) public scope: IContainer) {}
    }

    const app = root.resolveOne(App);

    expect(app.scope).not.toBe(root);
    expect(app.scope.hasTag('child')).toBe(true);
  });
});
