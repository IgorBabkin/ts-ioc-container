import 'reflect-metadata';
import { asSingleton, Container, forKey, perTags, provider, ReflectionInjector, Registration } from 'ts-ioc-container';

@forKey('ILogger')
@provider(asSingleton(), perTags('root'))
class Logger {}

describe('Registration module', function () {
  it('should bind dependency key to class', function () {
    const root = new Container(new ReflectionInjector(), { tags: ['root'] }).add(Registration.fromClass(Logger));

    expect(root.resolve('ILogger')).toBeInstanceOf(Logger);
  });
});
