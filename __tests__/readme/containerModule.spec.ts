import { bindTo, Container, type IContainer, type IContainerModule, register, Registration as R } from '../../lib';

@register(bindTo('ILogger'))
class Logger {}

@register(bindTo('ILogger'))
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

    expect(container.resolve('ILogger')).toBeInstanceOf(Logger);
  });

  it('should register development dependencies', function () {
    const container = createContainer(false);

    expect(container.resolve('ILogger')).toBeInstanceOf(TestLogger);
  });
});
