import 'reflect-metadata';
import { asKey, Container, type IContainer, type IContainerModule, register, Registration as R } from '../../lib';

@register(asKey('ILogger'))
class Logger {}

@register(asKey('ILogger'))
class TestLogger {}

class Production implements IContainerModule {
  applyTo(container: IContainer): void {
    container.addRegistration(R.fromClass(Logger));
  }
}

class Development implements IContainerModule {
  applyTo(container: IContainer): void {
    container.addRegistration(R.fromClass(TestLogger));
  }
}

describe('Container Modules', function () {
  function createContainer(isProduction: boolean) {
    return new Container().useModule(isProduction ? new Production() : new Development());
  }

  it('should register production dependencies', function () {
    const container = createContainer(true);

    expect(container.resolveOne('ILogger')).toBeInstanceOf(Logger);
  });

  it('should register development dependencies', function () {
    const container = createContainer(false);

    expect(container.resolveOne('ILogger')).toBeInstanceOf(TestLogger);
  });
});
