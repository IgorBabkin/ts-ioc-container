import 'reflect-metadata';
import {
  AddOnConstructHookModule,
  Container,
  decorate,
  type HookFn,
  lazy,
  onConstruct,
  Registration as R,
} from '../../lib';

const execute: HookFn = (ctx) => {
  ctx.invokeMethod({ args: ctx.resolveArgs() });
};

/**
 * A provider registers the instance it hands back with the resolving scope, so that
 * `getInstances`, `hasInstance` and the `onConstruct` hooks all see the object the
 * consumer actually received.
 *
 * Two shapes need care:
 * - `decorate()` replaces the instance after the injector built it, so the decorator
 *   is what must be registered.
 * - `lazy()` hands back a proxy, which must *not* be registered — registering it runs
 *   the `onConstruct` hooks against the proxy and would resolve the target eagerly.
 */
describe('provider instance registration', () => {
  describe('lazy providers', () => {
    it('does not register the lazy proxy as an instance of the scope', () => {
      class ReportGenerator {}

      const container = new Container().addRegistration(
        R.fromClass(ReportGenerator).pipe(lazy()).bindTo('ReportGenerator'),
      );

      container.resolve('ReportGenerator');

      expect(container.getInstances()).toEqual([]);
    });

    it('registers the real instance once the lazy proxy is first accessed', () => {
      class ReportGenerator {
        generate() {
          return 'report';
        }
      }

      const container = new Container().addRegistration(
        R.fromClass(ReportGenerator).pipe(lazy()).bindTo('ReportGenerator'),
      );

      const generator = container.resolve<ReportGenerator>('ReportGenerator');
      generator.generate();

      const instances = container.getInstances();
      expect(instances).toHaveLength(1);
      expect(instances[0]).toBeInstanceOf(ReportGenerator);
    });

    it('keeps construction deferred when onConstruct hooks are installed', () => {
      let constructed = 0;
      let initialized = 0;

      class ReportGenerator {
        constructor() {
          constructed++;
        }

        @onConstruct(execute)
        init() {
          initialized++;
        }

        generate() {
          return 'report';
        }
      }

      const container = new Container()
        .useModule(new AddOnConstructHookModule())
        .addRegistration(R.fromClass(ReportGenerator).pipe(lazy()).bindTo('ReportGenerator'));

      const generator = container.resolve<ReportGenerator>('ReportGenerator');

      expect(constructed).toBe(0);
      expect(initialized).toBe(0);

      generator.generate();

      expect(constructed).toBe(1);
      expect(initialized).toBe(1);
    });

    it('runs onConstruct exactly once for a lazy dependency', () => {
      let initialized = 0;

      class ReportGenerator {
        @onConstruct(execute)
        init() {
          initialized++;
        }

        generate() {
          return 'report';
        }
      }

      const container = new Container()
        .useModule(new AddOnConstructHookModule())
        .addRegistration(R.fromClass(ReportGenerator).pipe(lazy()).bindTo('ReportGenerator'));

      const generator = container.resolve<ReportGenerator>('ReportGenerator');
      generator.generate();
      generator.generate();

      expect(initialized).toBe(1);
      expect(container.getInstances()).toHaveLength(1);
    });
  });

  describe('decorated providers', () => {
    class Real {
      hello() {
        return 'real';
      }
    }

    class Wrapper {
      constructor(readonly inner: Real) {}

      hello() {
        return 'wrapped';
      }
    }

    it('registers the decorated instance the consumer received', () => {
      const container = new Container().addRegistration(
        R.fromClass(Real)
          .pipe(decorate((instance: Real) => new Wrapper(instance) as unknown as Real))
          .bindTo('Greeter'),
      );

      const greeter = container.resolve<Real>('Greeter');

      expect(greeter).toBeInstanceOf(Wrapper);
      expect(container.hasInstance(greeter as object)).toBe(true);
      expect(container.getScopeByInstanceOrFail(greeter as object)).toBe(container);
    });

    it('runs onConstruct hooks against the decorated instance', () => {
      const seen: string[] = [];

      const container = new Container()
        .addOnConstructHook((instance) => {
          seen.push((instance as object).constructor.name);
        })
        .addRegistration(
          R.fromClass(Real)
            .pipe(decorate((instance: Real) => new Wrapper(instance) as unknown as Real))
            .bindTo('Greeter'),
        );

      container.resolve('Greeter');

      expect(seen).toContain('Wrapper');
    });
  });

  describe('plain providers', () => {
    it('registers an instance exactly once', () => {
      class Service {}

      const container = new Container().addRegistration(R.fromClass(Service).bindTo('Service'));

      const service = container.resolve<Service>('Service');

      expect(container.getInstances()).toEqual([service]);
    });

    it('runs onConstruct exactly once for an eagerly resolved instance', () => {
      let initialized = 0;

      class Service {
        @onConstruct(execute)
        init() {
          initialized++;
        }
      }

      const container = new Container()
        .useModule(new AddOnConstructHookModule())
        .addRegistration(R.fromClass(Service).bindTo('Service'));

      container.resolve('Service');

      expect(initialized).toBe(1);
    });
  });
});
