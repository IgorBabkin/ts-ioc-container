import 'reflect-metadata';
import { singleton, Container, tags, provider, ReflectionInjector, Registration, key } from '../../lib';

describe('Registration module', function () {
  const createContainer = () => new Container(new ReflectionInjector(), { tags: ['root'] });

  it('should register dependency by @key', function () {
    @key('ILogger')
    @provider(singleton(), tags('root'))
    class Logger {}

    const root = createContainer().use(Registration.fromClass(Logger));

    expect(root.resolve('ILogger')).toBeInstanceOf(Logger);
  });

  it('should register dependency by class name if @key is not provided', function () {
    class FileLogger {}

    const root = createContainer().use(Registration.fromClass(FileLogger));

    expect(root.resolve('FileLogger')).toBeInstanceOf(FileLogger);
  });
});
