import 'reflect-metadata';
import {
  constructor,
  Container,
  hook,
  IContainer,
  IInjector,
  InjectOptions,
  key,
  MetadataInjector,
  register,
  Registration as R,
  runHooks,
} from '../lib';

class MyInjector implements IInjector {
  private injector = new MetadataInjector();

  resolve<T>(container: IContainer, value: constructor<T>, options: InjectOptions): T {
    const instance = this.injector.resolve(container, value, options);
    runHooks(instance as object, 'onConstruct', { scope: container });
    return instance;
  }
}

@register(key('logger'))
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
