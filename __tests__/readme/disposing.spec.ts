import { by, Container, ContainerDisposedError, Registration as R } from '../../lib';

class Logger {}

describe('Disposing', function () {
  it('should container and make it unavailable for the further usage', function () {
    const root = new Container({ tags: ['root'] }).addRegistration(R.fromClass(Logger).bindToKey('ILogger'));

    root.dispose();

    expect(() => root.resolveOne('ILogger')).toThrow(ContainerDisposedError);
    expect(by.instances().resolve(root).length).toBe(0);
  });
});
