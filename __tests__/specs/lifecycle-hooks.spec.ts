import 'reflect-metadata';
import {
  AddOnConstructHookModule,
  AddOnDisposeHookModule,
  Container,
  hasHooks,
  hook,
  HookContext,
  type HookFn,
  HooksRunner,
  inject,
  injectProp,
  onConstruct,
  onDispose,
  Registration as R,
  UnexpectedHookResultError,
} from '../../lib';

const invoke: HookFn = (context) => {
  context.invokeMethod();
};

describe('Spec: lifecycle hooks', () => {
  it('runs construct and dispose hooks through opt-in modules', () => {
    class Resource {
      initialized = false;
      disposed = false;

      @onConstruct(invoke)
      initialize(): void {
        this.initialized = true;
      }

      @onDispose(invoke)
      destroy(): void {
        this.disposed = true;
      }
    }

    const container = new Container()
      .useModule(new AddOnConstructHookModule())
      .useModule(new AddOnDisposeHookModule())
      .addRegistration(R.fromClass(Resource));

    const resource = container.resolve<Resource>('Resource');

    expect(resource.initialized).toBe(true);

    container.dispose();

    expect(resource.disposed).toBe(true);
  });

  it('injects properties through hook context scope', () => {
    class Logger {
      readonly name = 'logger';
    }

    class Service {
      @onConstruct(injectProp('Logger'))
      logger!: Logger;
    }

    const container = new Container()
      .useModule(new AddOnConstructHookModule())
      .addRegistration(R.fromClass(Logger))
      .addRegistration(R.fromClass(Service));

    expect(container.resolve<Service>('Service').logger).toBeInstanceOf(Logger);
  });

  it('executes custom hooks with predicates and hook classes', () => {
    class AuditHook {
      execute(context: Omit<HookContext, 'scope'>): void {
        context.invokeMethod();
      }
    }

    class Worker {
      calls: string[] = [];

      @hook('workflow', AuditHook)
      start(): void {
        this.calls.push('start');
      }

      @hook('workflow', invoke)
      stop(): void {
        this.calls.push('stop');
      }
    }

    const runner = new HooksRunner('workflow');
    const container = new Container().addRegistration(R.fromClass(AuditHook)).addRegistration(R.fromClass(Worker));
    const worker = container.resolve<Worker>('Worker');

    runner.execute(worker, {
      scope: container,
      predicate: (methodName) => methodName === 'start',
    });

    expect(hasHooks(worker, 'workflow')).toBe(true);
    expect(worker.calls).toEqual(['start']);
  });

  it('resolves hook method arguments and separates sync from async execution', async () => {
    class Worker {
      calls: string[] = [];

      @hook('sync', invoke)
      start(@inject('prefix') prefix: string): void {
        this.calls.push(`${prefix}:sync`);
      }

      @hook('async', async (context) => {
        context.invokeMethod();
      })
      stop(@inject('prefix') prefix: string): void {
        this.calls.push(`${prefix}:async`);
      }

      @hook('badAsync', async () => undefined)
      bad(): void {}
    }

    const container = new Container()
      .addRegistration(R.fromValue('job').bindToKey('prefix'))
      .addRegistration(R.fromClass(Worker));
    const worker = container.resolve<Worker>('Worker');

    new HooksRunner('sync').execute(worker, { scope: container });
    expect(() => new HooksRunner('badAsync').execute(worker, { scope: container })).toThrowError(
      UnexpectedHookResultError,
    );

    await new HooksRunner('async').executeAsync(worker, { scope: container });

    expect(worker.calls).toEqual(['job:sync', 'job:async']);
  });
});
