import {
  bindTo,
  type constructor,
  Container,
  hook,
  type IContainer,
  type IInjector,
  type InjectOptions,
  MetadataInjector,
  register,
  Registration as R,
  SyncHooksRunner,
} from '../lib';

const onConstructHooksRunner = new SyncHooksRunner('onConstruct');
class MyInjector implements IInjector {
  private injector = new MetadataInjector();

  resolve<T>(container: IContainer, value: constructor<T>, options: InjectOptions): T {
    const instance = this.injector.resolve(container, value, options);
    onConstructHooksRunner.execute(instance as object, { scope: container });
    return instance;
  }
}

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
    const container = new Container({ injector: new MyInjector() }).addRegistration(R.fromClass(Logger));

    const logger = container.resolve<Logger>('logger');

    expect(logger.isReady).toBe(true);
  });
});
