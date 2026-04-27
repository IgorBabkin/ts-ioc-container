import { args, argsFn, Container, inject, Registration as R, setArgsFn, SingleToken } from '../../lib';

describe('inject helpers', () => {
  function createContainer() {
    return new Container();
  }

  describe('args(index)', () => {
    it('extracts positional arg by index via @inject', () => {
      class Service {
        constructor(@inject(args(0)) public value: string) {}
      }

      const container = createContainer().addRegistration(R.fromClass(Service).pipe(setArgsFn(() => ['hello'])));
      expect(container.resolve<Service>('Service').value).toBe('hello');
    });

    it('extracts the correct index when multiple args are present', () => {
      class Service {
        constructor(
          @inject(args(0)) public first: string,
          @inject(args(1)) public second: string,
        ) {}
      }

      const container = createContainer().addRegistration(R.fromClass(Service).pipe(setArgsFn(() => ['foo', 'bar'])));
      const instance = container.resolve<Service>('Service');
      expect(instance.first).toBe('foo');
      expect(instance.second).toBe('bar');
    });

    it('returns undefined for out-of-bounds index', () => {
      class Service {
        constructor(@inject(args(5)) public value: unknown) {}
      }

      const container = createContainer().addRegistration(R.fromClass(Service).pipe(setArgsFn(() => ['only'])));
      expect(container.resolve<Service>('Service').value).toBeUndefined();
    });

    it('resolves InjectionToken args passed via token.args() before reaching @inject(args(...))', () => {
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
  });

  describe('argsFn', () => {
    it('maps the full args array to a value via @inject', () => {
      class Service {
        constructor(@inject(argsFn((a) => (a[0] as number) + (a[1] as number))) public sum: number) {}
      }

      const container = createContainer().addRegistration(R.fromClass(Service).pipe(setArgsFn(() => [3, 4])));
      expect(container.resolve<Service>('Service').sum).toBe(7);
    });

    it('receives an empty array when no args are provided', () => {
      class Service {
        constructor(@inject(argsFn((a) => a.length)) public count: number) {}
      }

      const container = createContainer().addRegistration(R.fromClass(Service));
      expect(container.resolve<Service>('Service').count).toBe(0);
    });

    it('can transform args into a complex object', () => {
      class Service {
        constructor(@inject(argsFn((a) => ({ first: a[0], second: a[1] }))) public data: unknown) {}
      }

      const container = createContainer().addRegistration(R.fromClass(Service).pipe(setArgsFn(() => ['x', 'y'])));
      expect(container.resolve<Service>('Service').data).toEqual({ first: 'x', second: 'y' });
    });
  });
});
