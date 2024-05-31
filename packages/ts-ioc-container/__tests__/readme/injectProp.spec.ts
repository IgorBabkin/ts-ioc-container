import { by, Container, hook, injectProp, MetadataInjector, Registration, runHooksAsync } from '../../lib';

describe('inject property', () => {
  it('should inject property', () => {
    class App {
      @hook('onInit', injectProp(by.key('greeting')))
      greeting!: string;
    }
    const expected = 'Hello world!';

    const container = new Container(new MetadataInjector()).add(Registration.fromValue(expected).to('greeting'));
    const app = container.resolve(App);
    runHooksAsync(app as object, 'onInit', { scope: container });

    expect(app.greeting).toBe(expected);
  });
});
