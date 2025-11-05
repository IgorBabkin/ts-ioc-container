import { Container, hook, injectProp, Registration, SyncHooksRunner } from '../../lib';

const onInitHookRunner = new SyncHooksRunner('onInit');
describe('inject property', () => {
  it('should inject property', () => {
    class App {
      @hook('onInit', injectProp('greeting'))
      greeting!: string;
    }
    const expected = 'Hello world!';

    const container = new Container().addRegistration(Registration.fromValue(expected).bindToKey('greeting'));
    const app = container.resolve(App);
    onInitHookRunner.execute(app as object, { scope: container });

    expect(app.greeting).toBe(expected);
  });
});
