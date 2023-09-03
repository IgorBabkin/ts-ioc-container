import 'reflect-metadata';
import { singleton, Container, key, tags, provider, ReflectionInjector, Registration } from 'ts-ioc-container';

@key('ILogger')
@provider(singleton(), tags('root')) // the same as .pipe(singleton(), tags('root'))
class Logger {}
describe('TaggedProvider', function () {
  it('should return the same instance', function () {
    const root = new Container(new ReflectionInjector(), { tags: ['root'] }).add(Registration.fromClass(Logger));
    const child = root.createScope();
    expect(root.resolve('ILogger')).toBe(child.resolve('ILogger'));
  });
});
