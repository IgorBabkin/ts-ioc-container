import 'reflect-metadata';
import {
  arg,
  AutoResolveModule,
  AutoResolveToken,
  Container,
  ContainerDisposedError,
  EmptyContainer,
  type IContainer,
  inject,
  MethodNotImplementedError,
  register,
  Registration as R,
  scope,
  scopeAccess,
  singleton,
} from '../../lib';

describe('AutoResolveModule', function () {
  let constructed: string[] = [];

  beforeEach(() => {
    constructed = [];
  });

  @register(AutoResolveToken, singleton())
  class Worker {
    constructor() {
      constructed.push('Worker');
    }
  }

  @register(singleton())
  class Logger {
    constructor() {
      constructed.push('Logger');
    }
  }

  function createApp(): IContainer {
    return new Container({ tags: ['application'] })
      .useModule(new AutoResolveModule())
      .addRegistration(R.fromClass(Worker))
      .addRegistration(R.fromClass(Logger));
  }

  it('should not resolve auto-resolvable providers without the module', function () {
    const app = new Container({ tags: ['application'] }).addRegistration(R.fromClass(Worker));

    app.createScope({ tags: ['request'] });

    expect(constructed).toEqual([]);
  });

  it('should resolve auto-resolvable providers when a scope is created', function () {
    createApp().createScope({ tags: ['request'] });

    expect(constructed).toEqual(['Worker']);
  });

  it('should leave providers without the pipe untouched', function () {
    const requestScope = createApp().createScope({ tags: ['request'] });

    expect(constructed).toEqual(['Worker']);

    requestScope.resolve('Logger');

    expect(constructed).toEqual(['Worker', 'Logger']);
  });

  it('should reuse the eagerly created instance for later resolution', function () {
    const requestScope = createApp().createScope({ tags: ['request'] });

    const worker = requestScope.resolve<Worker>('Worker');

    expect(constructed).toEqual(['Worker']);
    expect(requestScope.resolve<Worker>('Worker')).toBe(worker);
  });

  it('should resolve one instance per created scope', function () {
    const app = createApp();

    const request1 = app.createScope({ tags: ['request'] });
    const request2 = app.createScope({ tags: ['request'] });

    expect(constructed).toEqual(['Worker', 'Worker']);
    expect(request1.resolve('Worker')).not.toBe(request2.resolve('Worker'));
  });

  it('should be inherited by nested scopes', function () {
    const requestScope = createApp().createScope({ tags: ['request'] });

    requestScope.createScope({ tags: ['transaction'] });

    expect(constructed).toEqual(['Worker', 'Worker']);
  });

  it('should skip providers which are not registered in the created scope', function () {
    @register(AutoResolveToken, scope((s) => s.hasTag('transaction')))
    class TransactionLog {
      constructor() {
        constructed.push('TransactionLog');
      }
    }

    const app = new Container({ tags: ['application'] })
      .useModule(new AutoResolveModule())
      .addRegistration(R.fromClass(TransactionLog));

    const requestScope = app.createScope({ tags: ['request'] });

    expect(constructed).toEqual([]);

    requestScope.createScope({ tags: ['transaction'] });

    expect(constructed).toEqual(['TransactionLog']);
  });

  it('should skip providers which deny access to the created scope', function () {
    @register(AutoResolveToken, scopeAccess(({ invocationScope }) => invocationScope.hasTag('admin')))
    class AdminPanel {
      constructor() {
        constructed.push('AdminPanel');
      }
    }

    const app = new Container({ tags: ['application'] })
      .useModule(new AutoResolveModule())
      .addRegistration(R.fromClass(AdminPanel));

    app.createScope({ tags: ['request'] });

    expect(constructed).toEqual([]);

    app.createScope({ tags: ['request', 'admin'] });

    expect(constructed).toEqual(['AdminPanel']);
  });

  it('should not auto resolve the container the module is applied to', function () {
    const app = createApp();

    expect(constructed).toEqual([]);

    AutoResolveToken.resolve(app);
    expect(constructed).toEqual(['Worker']);
  });

  it('should not resolve auto-resolvable providers twice on the same scope', function () {
    const requestScope = createApp().createScope({ tags: ['request'] });

    AutoResolveToken.resolve(requestScope, { shallow: true });

    expect(constructed).toEqual(['Worker']);
  });

  it('should resolve only the providers of the created scope, not of its parents', function () {
    @register(AutoResolveToken, scope((s) => s.hasTag('application')))
    class ApplicationJob {
      constructor() {
        constructed.push('ApplicationJob');
      }
    }

    const app = new Container({ tags: ['application'] })
      .useModule(new AutoResolveModule())
      .addRegistration(R.fromClass(ApplicationJob));
    AutoResolveToken.resolve(app);

    app.createScope({ tags: ['request'] });
    app.createScope({ tags: ['request'] });

    // Not a singleton, so a parent lookup would have built one more per created scope
    expect(constructed).toEqual(['ApplicationJob']);
  });

  it('should keep the auto-resolved providers resolvable as a group', function () {
    const requestScope = createApp().createScope({ tags: ['request'] });

    const [worker] = AutoResolveToken.resolve(requestScope);

    expect(worker).toBeInstanceOf(Worker);
    expect(worker).toBe(requestScope.resolve('Worker'));
  });

  it('should throw when the container is disposed', function () {
    const app = createApp();
    app.dispose();

    expect(() => AutoResolveToken.resolve(app)).toThrowError(ContainerDisposedError);
  });

  it('should stop auto resolving scopes of a disposed parent', function () {
    const app = createApp();
    const requestScope = app.createScope({ tags: ['request'] });
    requestScope.dispose();

    expect(() => requestScope.createScope({ tags: ['transaction'] })).toThrowError(ContainerDisposedError);
  });

  it('should not be supported by an empty container', function () {
    expect(() => new AutoResolveModule().applyTo(new EmptyContainer())).toThrowError(MethodNotImplementedError);
  });

  describe('args', function () {
    @register(AutoResolveToken, singleton())
    class Reporter {
      constructor(@inject(arg(0)) readonly requestId: string = 'none') {
        constructed.push(`Reporter:${requestId}`);
      }
    }

    it('should forward args to eagerly resolved providers', function () {
      const app = new Container({ tags: ['application'] }).addRegistration(R.fromClass(Reporter));

      AutoResolveToken.resolve(app, { args: ['request-1'] });

      expect(constructed).toEqual(['Reporter:request-1']);
      expect(app.resolve<Reporter>('Reporter').requestId).toBe('request-1');
    });

    it('should forward module args to every created scope', function () {
      const app = new Container({ tags: ['application'] })
        .useModule(new AutoResolveModule({ args: ['request-1'] }))
        .addRegistration(R.fromClass(Reporter));

      const requestScope = app.createScope({ tags: ['request'] });

      expect(constructed).toEqual(['Reporter:request-1']);
      expect(requestScope.resolve<Reporter>('Reporter').requestId).toBe('request-1');
    });

    it('should treat args as optional', function () {
      const app = new Container({ tags: ['application'] })
        .useModule(new AutoResolveModule({}))
        .addRegistration(R.fromClass(Reporter));

      AutoResolveToken.resolve(app);
      app.createScope({ tags: ['request'] });

      expect(constructed).toEqual(['Reporter:none', 'Reporter:none']);
    });

    it('should pass args to the scope access rule', function () {
      const seenArgs: unknown[][] = [];

      @register(
        AutoResolveToken,
        scopeAccess(({ args: accessArgs }) => {
          seenArgs.push(accessArgs);
          return true;
        }),
      )
      class AuditedReporter {}

      new Container({ tags: ['application'] })
        .useModule(new AutoResolveModule({ args: ['request-1'] }))
        .addRegistration(R.fromClass(AuditedReporter))
        .createScope({ tags: ['request'] });

      expect(seenArgs).toEqual([['request-1']]);
    });

    it('should pass args to the singleton cache key', function () {
      @register(AutoResolveToken, singleton(([tenant]) => tenant as string))
      class TenantCache {
        constructor(@inject(arg(0)) readonly tenant: string) {
          constructed.push(`TenantCache:${tenant}`);
        }
      }

      const app = new Container({ tags: ['application'] }).addRegistration(R.fromClass(TenantCache));

      AutoResolveToken.resolve(app, { args: ['acme'] });
      AutoResolveToken.resolve(app, { args: ['acme'] });
      AutoResolveToken.resolve(app, { args: ['globex'] });

      expect(constructed).toEqual(['TenantCache:acme', 'TenantCache:globex']);
    });
  });
});
