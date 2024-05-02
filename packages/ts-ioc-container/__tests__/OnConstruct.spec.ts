import 'reflect-metadata';
import {
  constructor,
  Container,
  key,
  getHooks,
  hook,
  IContainer,
  IInjector,
  MetadataInjector,
  Registration as R,
  register,
} from '../lib';
import { InjectOptions } from '../lib/injector/IInjector.ts';

class MyInjector implements IInjector {
  private injector = new MetadataInjector();

  resolve<T>(container: IContainer, value: constructor<T>, options: InjectOptions): T {
    const instance = this.injector.resolve(container, value, options);
    // eslint-disable-next-line @typescript-eslint/ban-types
    for (const [h] of getHooks(instance as object, 'onConstruct')) {
      // @ts-ignore
      instance[h]();
    }
    return instance;
  }
}

@register(key('logger'))
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
    const container = new Container(new MyInjector()).add(R.fromClass(Logger));

    const logger = container.resolve<Logger>('logger');

    expect(logger.isReady).toBe(true);
  });
});
