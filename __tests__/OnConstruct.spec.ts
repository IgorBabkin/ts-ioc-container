import {
  bindTo,
  Container,
  hook,
  HookContext,
  HookFn,
  HooksRunner,
  inject,
  onConstruct,
  register,
  Registration as R,
} from '../lib';

const onConstructHooksRunner = new HooksRunner('onConstruct');

@register(bindTo('logger'))
class Logger {
  isReady = false;

  @hook('onConstruct', (context) => {
    context.invokeMethod({ args: [] });
  }) // <--- or extract it to @onConstruct
  initialize() {
    this.isReady = true;
  }

  log(message: string): void {
    console.log(message);
  }
}

describe('onConstruct', function () {
  it('should make logger be ready on resolve', function () {
    const container = new Container()
      .addOnConstructHook((instance, scope) => {
        onConstructHooksRunner.execute(instance as object, { scope });
      })
      .addRegistration(R.fromClass(Logger));

    const logger = container.resolve<Logger>('logger');

    expect(logger.isReady).toBe(true);
  });

  it('should run methods and resolve arguments from container', function () {
    const execute: HookFn = (ctx: HookContext) => {
      ctx.invokeMethod({ args: ctx.resolveArgs() });
    };

    class Car {
      private engine!: string;

      @onConstruct(execute)
      setEngine(@inject('engine') engine: string) {
        this.engine = engine;
      }

      getEngine() {
        return this.engine;
      }
    }

    const root = new Container()
      .addOnConstructHook((instance, scope) => {
        onConstructHooksRunner.execute(instance as object, { scope });
      })
      .addRegistration(R.fromValue('bmw').bindTo('engine'));

    const car = root.resolve(Car);

    expect(car.getEngine()).toBe('bmw');
  });
});
