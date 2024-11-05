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
  Tag,
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

  it('should get path by reduceToRoot', () => {
    const root = new Container(new MetadataInjector(), { tags: ['root'] });
    const child = root.createScope({ tags: ['child'] });
    const grandChild = child.createScope({ tags: ['grandChild'] });
    const collectTags = (acc: Array<Tag[]>, c: IContainer) => [...acc, Array.from(c.tags)];

    const tagsPath = grandChild.reduceToRoot(collectTags, []);
    expect(tagsPath).toEqual([['root'], ['child'], ['grandChild']]);
    const actual = root.findChild((s) => {
      const current = tagsPath.shift() ?? [];
      const a = current.every((t) => s.hasTag(t));
      const b = tagsPath.length === 0;
      return a && b;
    });
    expect(actual).toBe(grandChild);
  });

  it('should be able to create scope idempotently', () => {
    const root = new Container(new MetadataInjector(), { tags: ['root'] });

    const child1 = root.createScope({ tags: ['child', 'a'], idempotent: true });
    const child2 = root.createScope({ tags: ['child', 'a'], idempotent: true });
    const child3 = root.createScope({ tags: ['child'], idempotent: true });

    expect(child1).toBe(child2);
    expect(child3).not.toBe(child2);
  });
});
