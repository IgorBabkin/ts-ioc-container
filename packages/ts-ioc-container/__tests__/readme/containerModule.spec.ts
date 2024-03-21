import 'reflect-metadata';
import { IContainerModule, Registration as R, IContainer, key, Container, MetadataInjector } from '../../lib';

@key('ILogger')
class Logger {}

@key('ILogger')
class TestLogger {}

class Production implements IContainerModule {
  applyTo(container: IContainer): void {
    container.use(R.fromClass(Logger));
  }
}

class Development implements IContainerModule {
  applyTo(container: IContainer): void {
    container.use(R.fromClass(TestLogger));
  }
}

describe('Container Modules', function () {
  function createContainer(isProduction: boolean) {
    return new Container(new MetadataInjector()).use(isProduction ? new Production() : new Development());
  }

  it('should register production dependencies', function () {
    const container = createContainer(true);

    expect(container.resolve('ILogger')).toBeInstanceOf(Logger);
  });

  it('should register development dependencies', function () {
    const container = createContainer(false);

    expect(container.resolve('ILogger')).toBeInstanceOf(TestLogger);
  });
});
