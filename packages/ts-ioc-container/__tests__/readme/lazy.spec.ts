import { by, Container, inject, MetadataInjector, provider, Registration as R, singleton } from '../../lib';

describe('lazy provider', () => {
  @provider(singleton())
  class Flag {
    isSet = false;

    set() {
      this.isSet = true;
    }
  }

  class Service {
    name = 'Service';

    constructor(@inject(by.key('Flag')) private flag: Flag) {
      this.flag.set();
    }

    greet() {
      return 'Hello';
    }
  }

  class App {
    constructor(@inject(by.key('Service', { lazy: true })) public service: Service) {}

    run() {
      return this.service.greet();
    }
  }

  function createContainer() {
    const container = new Container(new MetadataInjector());
    container.add(R.toClass(Flag)).add(R.toClass(Service));
    return container;
  }

  it('should not create an instance until method is not invoked', () => {
    // Arrange
    const container = createContainer();

    // Act
    const app = container.resolve(App);
    const flag = container.resolve<Flag>('Flag');

    // Assert
    expect(flag.isSet).toBe(false);
  });

  it('should create an instance only when some method/property is invoked', () => {
    // Arrange
    const container = createContainer();

    // Act
    const app = container.resolve(App);
    const flag = container.resolve<Flag>('Flag');

    // Assert
    expect(app.run()).toBe('Hello');
    expect(flag.isSet).toBe(true);
  });

  it('should not create instance on every method invoked', () => {
    // Arrange
    const container = createContainer();

    // Act
    const app = container.resolve(App);

    // Assert
    expect(app.run()).toBe('Hello');
    expect(app.run()).toBe('Hello');
    expect(Array.from(container.instances).filter((x) => x instanceof Service).length).toBe(1);
  });

  it('should create instance when property is invoked', () => {
    // Arrange
    const container = createContainer();

    // Act
    const app = container.resolve(App);
    const flag = container.resolve<Flag>('Flag');

    // Assert
    expect(app.service.name).toBe('Service');
    expect(flag.isSet).toBe(true);
  });
});
