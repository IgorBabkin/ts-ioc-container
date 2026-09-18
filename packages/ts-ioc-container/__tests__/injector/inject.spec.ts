import 'reflect-metadata';
import {
  arg,
  args,
  appendArgs,
  appendArgsFn,
  argsFn,
  argToToken,
  by,
  Container,
  inject,
  register,
  Registration as R,
  SingleToken,
  pipe,
  UnsupportedTokenTypeError,
} from '../../lib';

describe('inject helpers', () => {
  function createContainer() {
    return new Container();
  }

  describe('arg(index)', () => {
    it('passes InjectionToken args through as-is - the call site resolves them', () => {
      const ValueToken = new SingleToken<string>('value');

      class Service {
        constructor(@inject(arg(0)) public value: unknown) {}
      }

      const ServiceToken = new SingleToken<Service>('Service');
      const container = createContainer()
        .addRegistration(R.fromValue('injected').bindTo(ValueToken))
        .addRegistration(R.fromClass(Service).bindTo(ServiceToken));

      expect(ServiceToken.args(ValueToken).resolve(container).value).toBe(ValueToken);
      expect(ServiceToken.argsFn((scope) => [ValueToken.resolve(scope)]).resolve(container).value).toBe('injected');
    });

    it('lets a custom InjectFn opt back into token resolution with argToToken', () => {
      const ValueToken = new SingleToken<string>('value');

      class Service {
        constructor(
          @inject(({ scope, args = [] }) => argToToken(args[0]).resolve(scope)) public first: unknown,
          @inject(({ scope, args = [] }) => argToToken(args[1]).resolve(scope)) public second: unknown,
        ) {}
      }

      const container = createContainer().addRegistration(R.fromValue('injected').bindTo(ValueToken));
      const instance = container.resolve(Service, { args: [ValueToken, 'literal'] });

      expect(instance.first).toBe('injected');
      expect(instance.second).toBe('literal');
    });

    it('returns undefined for out-of-bounds index', () => {
      @register(appendArgs('only'))
      class Service {
        constructor(@inject(arg(5)) public value: unknown) {}
      }

      const container = createContainer().addRegistration(R.fromClass(Service));
      expect(container.resolve<Service>('Service').value).toBeUndefined();
    });

    it('is a shortcut for argsFn matching on index', () => {
      @register(appendArgs('a', 'b', 'c'))
      class Service {
        constructor(
          @inject(arg(1)) public viaArgs: unknown,
          @inject(argsFn((value, index) => index === 1)) public viaArgsFn: unknown,
        ) {}
      }

      const container = createContainer().addRegistration(R.fromClass(Service));
      const service = container.resolve<Service>('Service');
      expect(service.viaArgs).toBe('b');
      expect(service.viaArgsFn).toBe('b');
    });
  });

  describe('args', () => {
    it('resolves the whole runtime args array', () => {
      @register(appendArgs('a', 'b', 'c'))
      class Service {
        constructor(@inject(args) public all: unknown[]) {}
      }

      const container = createContainer().addRegistration(R.fromClass(Service));
      expect(container.resolve<Service>('Service').all).toEqual(['a', 'b', 'c']);
    });

    it('resolves an empty array when no args were passed', () => {
      class Service {
        constructor(@inject(args) public all: unknown[]) {}
      }

      const container = createContainer().addRegistration(R.fromClass(Service));
      expect(container.resolve<Service>('Service').all).toEqual([]);
    });
  });

  describe('by(target)', () => {
    class Config {
      constructor(@inject(arg(0)) readonly env: string = 'default') {}
    }

    const ConfigToken = new SingleToken<Config>('Config');

    it('resolves a token from the scope', () => {
      class Service {
        constructor(@inject(by(ConfigToken)) public config: Config) {}
      }

      const container = createContainer()
        .addRegistration(R.fromClass(Config).bindTo(ConfigToken))
        .addRegistration(R.fromClass(Service));

      expect(container.resolve<Service>('Service').config).toBeInstanceOf(Config);
    });

    it('resolves a dependency key from the scope', () => {
      class Service {
        constructor(@inject(by('Config')) public config: Config) {}
      }

      const container = createContainer()
        .addRegistration(R.fromClass(Config).bindTo(ConfigToken))
        .addRegistration(R.fromClass(Service));

      expect(container.resolve<Service>('Service').config).toBeInstanceOf(Config);
    });

    it('resolves a class from the scope', () => {
      class Service {
        constructor(@inject(by(Config)) public config: Config) {}
      }

      const container = createContainer().addRegistration(R.fromClass(Service));

      expect(container.resolve<Service>('Service').config).toBeInstanceOf(Config);
    });

    it('forwards the runtime args of the class being constructed', () => {
      class Service {
        constructor(@inject(by(ConfigToken)) public config: Config) {}
      }

      const container = createContainer()
        .addRegistration(R.fromClass(Config).bindTo(ConfigToken))
        .addRegistration(R.fromClass(Service));

      expect(container.resolve<Service>('Service', { args: ['prod'] }).config.env).toBe('prod');
    });

    it('composes with pipe', () => {
      class Service {
        constructor(@inject(pipe(by(ConfigToken), (config) => config.env)) public env: string) {}
      }

      const container = createContainer()
        .addRegistration(R.fromClass(Config).bindTo(ConfigToken))
        .addRegistration(R.fromClass(Service));

      expect(container.resolve<Service>('Service').env).toBe('default');
    });

    it('rejects anything but a token, a key or a class', () => {
      expect(() => by(42 as never)).toThrowError(UnsupportedTokenTypeError);
    });
  });

  describe('inject(fn)', () => {
    it('injects whatever the function returns', () => {
      class Config {}

      const ConfigToken = new SingleToken<Config>('Config');

      class Service {
        constructor(@inject(by(ConfigToken)) public config: Config) {}
      }

      const container = createContainer()
        .addRegistration(R.fromClass(Config).bindTo(ConfigToken))
        .addRegistration(R.fromClass(Service));

      expect(container.resolve<Service>('Service').config).toBeInstanceOf(Config);
    });

    it('composes with pipe to inject a selected part of the dependency', () => {
      class Config {
        constructor(readonly apiUrl: string = 'https://api.com') {}
      }

      const ConfigToken = new SingleToken<Config>('Config');

      class Service {
        constructor(
          @inject(pipe(by(ConfigToken), (config) => config.apiUrl))
          public apiUrl: string,
        ) {}
      }

      const container = createContainer()
        .addRegistration(R.fromClass(Config).bindTo(ConfigToken))
        .addRegistration(R.fromClass(Service));

      expect(container.resolve<Service>('Service').apiUrl).toBe('https://api.com');
    });

    it('forwards resolve args to the dependency before selecting', () => {
      class Config {
        constructor(@inject(arg(0)) readonly apiUrl: string) {}
      }

      const ConfigToken = new SingleToken<Config>('Config');

      class Service {
        constructor(
          @inject(pipe(by(ConfigToken.args('https://other.com')), (c) => c.apiUrl))
          public apiUrl: string,
        ) {}
      }

      const container = createContainer()
        .addRegistration(R.fromClass(Config).bindTo(ConfigToken))
        .addRegistration(R.fromClass(Service));

      expect(container.resolve<Service>('Service').apiUrl).toBe('https://other.com');
    });

    it('selects from a runtime arg', () => {
      @register(appendArgs({ id: 42 }))
      class Service {
        constructor(@inject(pipe(arg<{ id: number }>(0), (value) => value.id)) public id: number) {}
      }

      const container = createContainer().addRegistration(R.fromClass(Service));
      expect(container.resolve<Service>('Service').id).toBe(42);
    });

    it('pipes the resolved dependency through every mapper, left to right', () => {
      const trim = () => (value: string) => value.trim();
      const upper = () => (value: string) => value.toUpperCase();
      const exclaim = () => (value: string) => `${value}!`;

      class Service {
        constructor(
          @inject(pipe(by<string>('Greeting'), trim(), upper(), exclaim()))
          public greeting: string,
        ) {}
      }

      const container = createContainer()
        .addRegistration(R.fromValue('  hello  ').bindToKey('Greeting'))
        .addRegistration(R.fromClass(Service));

      expect(container.resolve<Service>('Service').greeting).toBe('HELLO!');
    });

    it('runs the function on every resolution', () => {
      let calls = 0;
      const count = () => (value: string) => {
        calls += 1;
        return `${value}-${calls}`;
      };

      class Service {
        constructor(@inject(pipe(by<string>('Greeting'), count())) public greeting: string) {}
      }

      const container = createContainer()
        .addRegistration(R.fromValue('hello').bindToKey('Greeting'))
        .addRegistration(R.fromClass(Service));

      expect(container.resolve<Service>('Service').greeting).toBe('hello-1');
      expect(container.resolve<Service>('Service').greeting).toBe('hello-2');
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
