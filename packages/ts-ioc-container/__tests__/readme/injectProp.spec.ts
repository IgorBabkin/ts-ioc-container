import { by, Container, hook, injectProp, MetadataInjector, Registration, runHooks, runHooksAsync } from '../../lib';

describe('inject property', () => {
  it('should inject property', () => {
    class App {
      @hook('onInit', injectProp(by.key('greeting')))
      greeting!: string;
    }
    const expected = 'Hello world!';

    const container = new Container(new MetadataInjector()).add(Registration.fromValue(expected).to('greeting'));
    const app = container.resolve(App);
    runHooks(app as object, 'onInit', { scope: container });

    expect(app.greeting).toBe(expected);
  });
});
