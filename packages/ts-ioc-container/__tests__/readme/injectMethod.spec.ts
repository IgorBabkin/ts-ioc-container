import { by, Container, executeHooks, hook, inject, invokeExecution, MetadataInjector, Registration } from '../../lib';

describe('inject method', () => {
  it('should inject method', () => {
    class App {
      greeting!: string;

      @hook('onInit', invokeExecution({ handleError: jest.fn(), handleResult: jest.fn() }))
      setGreeting(@inject(by.key('greeting')) greeting: string) {
        this.greeting = greeting;
      }
    }
    const expected = 'Hello world!';

    const container = new Container(new MetadataInjector()).add(Registration.fromValue(expected).to('greeting'));
    const app = container.resolve(App);
    executeHooks(app, 'onInit', { scope: container });

    expect(app.greeting).toBe(expected);
  });
});
