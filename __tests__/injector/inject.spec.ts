import 'reflect-metadata';
import {
  args,
  appendArgs,
  appendArgsFn,
  argsFn,
  Container,
  inject,
  register,
  Registration as R,
  SingleToken,
} from '../../lib';

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
      @register(appendArgs('only'))
      class Service {
        constructor(@inject(args(5)) public value: unknown) {}
      }

      const container = createContainer().addRegistration(R.fromClass(Service));
      expect(container.resolve<Service>('Service').value).toBeUndefined();
    });

    it('is a shortcut for argsFn matching on index', () => {
      @register(appendArgs('a', 'b', 'c'))
      class Service {
        constructor(
          @inject(args(1)) public viaArgs: unknown,
          @inject(argsFn((value, index) => index === 1)) public viaArgsFn: unknown,
        ) {}
      }

      const container = createContainer().addRegistration(R.fromClass(Service));
      const service = container.resolve<Service>('Service');
      expect(service.viaArgs).toBe('b');
      expect(service.viaArgsFn).toBe('b');
    });
  });

  describe('argsFn(predicate)', () => {
    it('returns the first arg matching the predicate', () => {
      @register(appendArgs(1, 'two', 3))
      class Service {
        constructor(@inject(argsFn((value) => typeof value === 'string')) public value: unknown) {}
      }

      const container = createContainer().addRegistration(R.fromClass(Service));
      expect(container.resolve<Service>('Service').value).toBe('two');
    });

    it('passes the arg index as the second predicate argument', () => {
      @register(appendArgsFn(() => ['x', 'y', 'z']))
      class Service {
        constructor(@inject(argsFn((value, index) => index === 2)) public value: unknown) {}
      }

      const container = createContainer().addRegistration(R.fromClass(Service));
      expect(container.resolve<Service>('Service').value).toBe('z');
    });

    it('returns undefined when no arg matches the predicate', () => {
      @register(appendArgs('a', 'b'))
      class Service {
        constructor(@inject(argsFn((value) => typeof value === 'number')) public value: unknown) {}
      }

      const container = createContainer().addRegistration(R.fromClass(Service));
      expect(container.resolve<Service>('Service').value).toBeUndefined();
    });
  });
});
