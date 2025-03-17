import 'reflect-metadata';
import { IContainerModule, Registration as R, IContainer, key, Container, register } from '../../lib';

@register(key('ILogger'))
class Logger {}

@register(key('ILogger'))
class TestLogger {}

class Production implements IContainerModule {
  applyTo(container: IContainer): void {
    container.add(R.toClass(Logger));
  }
}

class Development implements IContainerModule {
  applyTo(container: IContainer): void {
    container.add(R.toClass(TestLogger));
  }
}

describe('Container Modules', function () {
  function createContainer(isProduction: boolean) {
    return new Container().use(isProduction ? new Production() : new Development());
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
