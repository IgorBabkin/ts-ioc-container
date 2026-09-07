import 'reflect-metadata';
import { Container, OnResolvedAsyncModule, Registration as R, onResolvedAsync, resolvedAsync } from '../../lib';

class Service {
  resolvedTimes = 0;
  openedTimes = 0;

  @onResolvedAsync()
  async track(): Promise<void> {
    await Promise.resolve();
    this.resolvedTimes += 1;
  }

  @onResolvedAsync({ once: true })
  async open(): Promise<void> {
    await Promise.resolve();
    this.openedTimes += 1;
  }
}

const settle = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

describe('OnResolvedAsyncModule', () => {
  it('should start the hooks on resolve and settle after it returns', async () => {
    const container = new Container().useModule(new OnResolvedAsyncModule()).addRegistration(R.fromClass(Service));

    const service = container.resolve<Service>('Service');

    expect(service.resolvedTimes).toBe(0);

    await settle();

    expect([service.resolvedTimes, service.openedTimes]).toEqual([1, 1]);
  });

  it('should run plain hooks on every resolve of the same object', async () => {
    const service = new Service();

    const container = new Container()
      .useModule(new OnResolvedAsyncModule())
      .addRegistration(R.fromValue(service).bindToKey('Service'));

    container.resolve('Service');
    container.resolve('Service');
    await settle();

    expect(service.resolvedTimes).toBe(2);
  });

  it('should run `once` hooks a single time however often the object is resolved', async () => {
    const service = new Service();

    const container = new Container()
      .useModule(new OnResolvedAsyncModule())
      .addRegistration(R.fromValue(service).bindToKey('Service'));

    container.resolve('Service');
    container.resolve('Service');
    await settle();

    expect(service.openedTimes).toBe(1);
  });

  it('should run `once` hooks a single time for an object resolved from several scopes', async () => {
    const service = new Service();

    const root = new Container({ tags: ['root'] })
      .useModule(new OnResolvedAsyncModule())
      .addRegistration(R.fromValue(service).bindToKey('Service'));

    root.createScope({ tags: ['child'] }).resolve('Service');
    root.createScope({ tags: ['child'] }).resolve('Service');
    await settle();

    expect(service.openedTimes).toBe(1);
  });

  it('should report a rejected hook to the onException handler', async () => {
    class Broken {
      @onResolvedAsync(async () => {
        throw new Error('hook failed');
      })
      initialize(): void {}
    }

    const exceptions: unknown[] = [];
    const container = new Container()
      .useModule(new OnResolvedAsyncModule((ex) => exceptions.push(ex)))
      .addRegistration(R.fromClass(Broken));

    container.resolve('Broken');
    await settle();

    expect(exceptions).toEqual([new Error('hook failed')]);
  });

  it('should skip dependencies which carry no async hooks', () => {
    class Plain {}

    const container = new Container()
      .useModule(new OnResolvedAsyncModule())
      .addRegistration(R.fromClass(Plain))
      .addRegistration(R.fromValue(1).bindToKey('One'));

    expect(container.resolve('One')).toBe(1);
    expect(container.resolve('Plain')).toBeInstanceOf(Plain);
  });
});

describe('resolvedAsync()', () => {
  it('should run the hooks when the piped dependency is resolved', async () => {
    const container = new Container().addRegistration(R.fromClass(Service).pipe(resolvedAsync()));

    const service = container.resolve<Service>('Service');
    await settle();

    expect([service.resolvedTimes, service.openedTimes]).toEqual([1, 1]);
  });

  it('should run `once` hooks a single time for an object resolved from several scopes', async () => {
    const service = new Service();

    const root = new Container({ tags: ['root'] }).addRegistration(
      R.fromValue(service).bindToKey('Service').pipe(resolvedAsync()),
    );

    root.createScope({ tags: ['child'] }).resolve('Service');
    root.createScope({ tags: ['child'] }).resolve('Service');
    await settle();

    expect([service.openedTimes, service.resolvedTimes]).toEqual([1, 2]);
  });

  it('should leave registrations it was not piped into alone', async () => {
    const container = new Container()
      .addRegistration(R.fromClass(Service).pipe(resolvedAsync()))
      .addRegistration(R.fromClass(Service).bindToKey('OtherService'));

    const service = container.resolve<Service>('OtherService');
    await settle();

    expect(service.resolvedTimes).toBe(0);
  });

  it('should report a rejected hook to the onException handler', async () => {
    class Broken {
      @onResolvedAsync(async () => {
        throw new Error('hook failed');
      })
      initialize(): void {}
    }

    const exceptions: unknown[] = [];
    const container = new Container().addRegistration(
      R.fromClass(Broken).pipe(resolvedAsync((ex) => exceptions.push(ex))),
    );

    container.resolve('Broken');
    await settle();

    expect(exceptions).toEqual([new Error('hook failed')]);
  });
});
