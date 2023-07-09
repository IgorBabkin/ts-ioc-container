import 'reflect-metadata';
import { Container, ContainerDisposedError, Provider, ReflectionInjector } from 'ts-ioc-container';

class Logger {}

describe('Disposing', function () {
  it('should container and make it unavailable for the further usage', function () {
    const container = new Container(new ReflectionInjector(), { tags: ['root'] }).register(
      'ILogger',
      Provider.fromClass(Logger),
    );
    const scope = container.createScope(['child']);

    const logger = scope.resolve('ILogger');
    container.dispose();

    expect(() => scope.resolve('ILogger')).toThrow(ContainerDisposedError);
    expect(() => container.resolve('ILogger')).toThrow(ContainerDisposedError);
    expect(container.getInstances().length).toBe(0);
  });
});
