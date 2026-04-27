import 'reflect-metadata';
import { args, argsFn, Container, inject, register, Registration as R, setArgsFn, SingleToken } from '../../lib';

describe('inject helpers', () => {
  function createContainer() {
    return new Container();
  }

  describe('args(index)', () => {
    it('resolves InjectionToken args before reaching @inject(args(...))', () => {
      const ValueToken = new SingleToken<string>('value');

      class Service {
        constructor(@inject(args(0)) public value: string) {}
      }

      const ServiceToken = new SingleToken<Service>('Service');
      const container = createContainer()
        .addRegistration(R.fromValue('injected').bindTo(ValueToken))
        .addRegistration(R.fromClass(Service).bindTo(ServiceToken));

      const instance = ServiceToken.args(ValueToken).resolve(container);
      expect(instance.value).toBe('injected');
    });

    it('returns undefined for out-of-bounds index', () => {
      @register(setArgsFn(() => ['only']))
      class Service {
        constructor(@inject(args(5)) public value: unknown) {}
      }

      const container = createContainer().addRegistration(R.fromClass(Service));
      expect(container.resolve<Service>('Service').value).toBeUndefined();
    });
  });

  describe('argsFn', () => {
    it('receives an empty array when no args are provided', () => {
      class Service {
        constructor(@inject(argsFn((...a) => a.length)) public count: number) {}
      }

      const container = createContainer().addRegistration(R.fromClass(Service));
      expect(container.resolve<Service>('Service').count).toBe(0);
    });

    it('can transform args into a complex object', () => {
      @register(setArgsFn(() => ['x', 'y']))
      class Service {
        constructor(@inject(argsFn((a, b) => ({ first: a, second: b }))) public data: unknown) {}
      }

      const container = createContainer().addRegistration(R.fromClass(Service));
      expect(container.resolve<Service>('Service').data).toEqual({ first: 'x', second: 'y' });
    });
  });
});
