import 'reflect-metadata';
import { Container, ContainerDisposedError, MetadataInjector, Registration as R } from '../../lib';

class Logger {}

describe('Disposing', function () {
  it('should container and make it unavailable for the further usage', function () {
    const root = new Container(new MetadataInjector(), { tags: ['root'] }).add(R.toClass(Logger).fromKey('ILogger'));
    const child = root.createScope({ tags: ['child'] });

    const logger = child.resolve('ILogger');
    root.dispose();

    expect(() => child.resolve('ILogger')).toThrow(ContainerDisposedError);
    expect(() => root.resolve('ILogger')).toThrow(ContainerDisposedError);
    expect(root.getInstances().length).toBe(0);
  });
});
