import 'reflect-metadata';
import { asSingleton, Container, forKey, perTags, provider, ReflectionInjector, Registration } from 'ts-ioc-container';

@forKey('ILogger')
@provider(asSingleton(), perTags('root'))
class Logger {}
describe('TaggedProvider', function () {
  it('should return the same instance', function () {
    const root = new Container(new ReflectionInjector(), { tags: ['root'] }).add(
      Registration.fromClass(Logger).pipe(perTags('root', 'parent')),
    );
    const child = root.createScope();
    expect(root.resolve('ILogger')).toBe(child.resolve('ILogger'));
  });
});
