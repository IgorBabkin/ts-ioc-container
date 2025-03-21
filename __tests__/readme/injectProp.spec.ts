import { by, Container, hook, injectProp, Registration, runHooks, runHooksAsync } from '../../lib';

describe('inject property', () => {
  it('should inject property', () => {
    class App {
      @hook('onInit', injectProp(by.key('greeting')))
      greeting!: string;
    }
    const expected = 'Hello world!';

    const container = new Container().add(Registration.toValue(expected).fromKey('greeting'));
    const app = container.resolve(App);
    runHooks(app as object, 'onInit', { scope: container });

    expect(app.greeting).toBe(expected);
  });
});
