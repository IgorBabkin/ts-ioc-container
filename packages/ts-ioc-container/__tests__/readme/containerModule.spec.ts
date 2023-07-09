import 'reflect-metadata';
import { IContainerModule, Registration, IContainer, forKey, Container, ReflectionInjector } from 'ts-ioc-container';

@forKey('ILogger')
class Logger {}

@forKey('ILogger')
class TestLogger {}

class Production implements IContainerModule {
  applyTo(container: IContainer): void {
    container.add(Registration.fromClass(Logger));
  }
}

class Development implements IContainerModule {
  applyTo(container: IContainer): void {
    container.add(Registration.fromClass(TestLogger));
  }
}

describe('Container Modules', function () {
  function createContainer(isProduction: boolean) {
    return new Container(new ReflectionInjector()).add(isProduction ? new Production() : new Development());
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