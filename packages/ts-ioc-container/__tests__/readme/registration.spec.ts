import 'reflect-metadata';
import { singleton, Container, tags, provider, ReflectionInjector, Registration, key } from 'ts-ioc-container';

@key('ILogger')
@provider(singleton(), tags('root'))
class Logger {}

describe('Registration module', function () {
  it('should bind dependency key to class', function () {
    const root = new Container(new ReflectionInjector(), { tags: ['root'] }).add(Registration.fromClass(Logger));

    expect(root.resolve('ILogger')).toBeInstanceOf(Logger);
  });
});
