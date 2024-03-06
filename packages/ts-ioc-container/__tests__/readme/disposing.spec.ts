import 'reflect-metadata';
import { Container, ContainerDisposedError, ReflectionInjector, Registration } from '../../lib';

class Logger {}

describe('Disposing', function () {
  it('should container and make it unavailable for the further usage', function () {
    const root = new Container(new ReflectionInjector(), { tags: ['root'] }).use(
      Registration.fromClass(Logger).to('ILogger'),
    );
    const child = root.createScope('child');

    const logger = child.resolve('ILogger');
    root.dispose();

    expect(() => child.resolve('ILogger')).toThrow(ContainerDisposedError);
    expect(() => root.resolve('ILogger')).toThrow(ContainerDisposedError);
    expect(root.getInstances().length).toBe(0);
  });
});
