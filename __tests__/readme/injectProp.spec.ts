import { Container, hook, injectProp, Registration, runHooks } from '../../lib';

describe('inject property', () => {
  it('should inject property', () => {
    class App {
      @hook('onInit', injectProp('greeting'))
      greeting!: string;
    }
    const expected = 'Hello world!';

    const container = new Container().addRegistration(Registration.fromValue(expected).bindToKey('greeting'));
    const app = container.resolveOne(App);
    runHooks(app as object, 'onInit', { scope: container });

    expect(app.greeting).toBe(expected);
  });
});
