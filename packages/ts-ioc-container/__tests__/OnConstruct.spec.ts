import 'reflect-metadata';
import {
  constructor,
  Container,
  key,
  getHooks,
  hook,
  IContainer,
  IInjector,
  ReflectionInjector,
  Registration,
} from '../lib';

class MyInjector implements IInjector {
  private injector = new ReflectionInjector();

  resolve<T>(container: IContainer, value: constructor<T>, ...deps: unknown[]): T {
    const instance = this.injector.resolve(container, value, ...deps);
    // eslint-disable-next-line @typescript-eslint/ban-types
    for (const h of getHooks(instance as object, 'onConstruct')) {
      // @ts-ignore
      instance[h]();
    }
    return instance;
  }
}

@key('logger')
class Logger {
  isReady = false;

  @hook('onConstruct') // <--- or extract it to @onConstruct
  initialize() {
    this.isReady = true;
  }

  log(message: string): void {
    console.log(message);
  }
}

describe('onConstruct', function () {
  it('should make logger be ready on resolve', function () {
    const container = new Container(new MyInjector()).use(Registration.fromClass(Logger));

    const logger = container.resolve<Logger>('logger');

    expect(logger.isReady).toBe(true);
  });
});
