import { args, Container, inject, Registration as R, setArgsFn, resolveByArgs, SingleToken } from '../../lib';

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

    it('works with resolveByArgs pattern for token-based arg injection', () => {
      const ValueToken = new SingleToken<string>('value');

      class Service {
        constructor(@inject(args(0)) public value: string) {}
      }

      const ServiceToken = new SingleToken<Service>('Service');
      const container = createContainer()
        .addRegistration(R.fromValue('injected').bindTo(ValueToken))
        .addRegistration(R.fromClass(Service).pipe(setArgsFn(resolveByArgs)).bindTo(ServiceToken));

      const instance = ServiceToken.args(ValueToken).resolve(container);
      expect(instance.value).toBe('injected');
    });
  });
});
