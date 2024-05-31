import { by, Container, hook, inject, invokeExecution, MetadataInjector, Registration, runHooksAsync } from '../../lib';

describe('inject method', () => {
  const sleep = (number: number) => new Promise((resolve) => setTimeout(resolve, number));

  it('should inject method', async () => {
    class App {
      greeting!: string;

      @hook('onInit', invokeExecution({ handleResult: jest.fn() }))
      setGreeting(@inject(by.key('greeting')) greeting: string) {
        this.greeting = greeting;
      }
    }
    const expected = 'Hello world!';

    const container = new Container(new MetadataInjector()).add(Registration.fromValue(expected).to('greeting'));
    const app = container.resolve(App);
    await runHooksAsync(app, 'onInit', { scope: container });

    expect(app.greeting).toBe(expected);
  });

  it('should inject method asyncronically', async () => {
    class App {
      greeting!: string;

      @hook('onInit', invokeExecution({ handleResult: jest.fn() }))
      setGreeting(@inject(by.key('greeting')) greeting: string, @inject(by.key('person')) person: string) {
        this.greeting = `${greeting}${person}`;
      }
    }

    const container = new Container(new MetadataInjector())
      .add(Registration.fromFn(() => sleep(50).then(() => 'Hello,')).to('greeting'))
      .add(Registration.fromFn(() => sleep(25).then(() => 'world')).to('person'));

    const app = container.resolve(App);
    await runHooksAsync(app, 'onInit', { scope: container });

    expect(app.greeting).toBe('Hello,world');
  });
});
