import 'reflect-metadata';
import { singleton, Container, tags, provider, ReflectionInjector, Registration, key } from '../../lib';

@key('ILogger')
@provider(singleton(), tags('root'))
class Logger {}

describe('Registration module', function () {
  it('should bind dependency key to class', function () {
    const root = new Container(new ReflectionInjector(), { tags: ['root'] }).use(Registration.fromClass(Logger));

    expect(root.resolve('ILogger')).toBeInstanceOf(Logger);
  });
});
