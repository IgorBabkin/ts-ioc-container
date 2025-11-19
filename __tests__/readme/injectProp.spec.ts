import { Container, hook, HooksRunner, injectProp, Registration } from '../../lib';

const onInitHookRunner = new HooksRunner('onInit');
describe('inject property', () => {
  it('should inject property', () => {
    class App {
      @hook('onInit', injectProp('greeting'))
      greeting!: string;
    }
    const expected = 'Hello world!';

    const scope = new Container().addRegistration(Registration.fromValue(expected).bindToKey('greeting'));
    const app = scope.resolve(App);
    onInitHookRunner.execute(app, { scope });

    expect(app.greeting).toBe(expected);
  });
});
