import { by, Container, hook, injectProp, Registration, runHooks } from '../../lib';

describe('inject property', () => {
  it('should inject property', () => {
    class App {
      @hook('onInit', injectProp(by.one('greeting')))
      greeting!: string;
    }
    const expected = 'Hello world!';

    const container = new Container().addRegistration(Registration.fromValue(expected).bindToKey('greeting'));
    const app = container.resolveOne(App);
    runHooks(app as object, 'onInit', { scope: container });

    expect(app.greeting).toBe(expected);
  });
});
