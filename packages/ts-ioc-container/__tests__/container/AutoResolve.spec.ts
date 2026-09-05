import 'reflect-metadata';
import {
  arg,
  autoResolve,
  AutoResolveModule,
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

describe('autoResolve', function () {
  let constructed: string[] = [];

  beforeEach(() => {
    constructed = [];
  });

  @register(autoResolve(), singleton())
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
    @register(autoResolve(), scope((s) => s.hasTag('transaction')))
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
    @register(autoResolve(), scopeAccess(({ invocationScope }) => invocationScope.hasTag('admin')))
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

    expect(app.autoResolve()).toBe(app);
    expect(constructed).toEqual(['Worker']);
  });

  it('should not resolve auto-resolvable providers twice on the same scope', function () {
    const requestScope = createApp().createScope({ tags: ['request'] });

    requestScope.autoResolve();

    expect(constructed).toEqual(['Worker']);
  });

  it('should throw when the container is disposed', function () {
    const app = createApp();
    app.dispose();

    expect(() => app.autoResolve()).toThrowError(ContainerDisposedError);
  });

  it('should stop auto resolving scopes of a disposed parent', function () {
    const app = createApp();
    const requestScope = app.createScope({ tags: ['request'] });
    requestScope.dispose();

    expect(() => requestScope.createScope({ tags: ['transaction'] })).toThrowError(ContainerDisposedError);
  });

  it('should not be supported by an empty container', function () {
    expect(() => new EmptyContainer().autoResolve()).toThrowError(MethodNotImplementedError);
    expect(() => new EmptyContainer().addOnScopeCreatedHook(() => {})).toThrowError(MethodNotImplementedError);
  });

  describe('args', function () {
    @register(autoResolve(), singleton())
    class Reporter {
      constructor(@inject(arg(0)) readonly requestId: string = 'none') {
        constructed.push(`Reporter:${requestId}`);
      }
    }

    it('should forward args to eagerly resolved providers', function () {
      const app = new Container({ tags: ['application'] }).addRegistration(R.fromClass(Reporter));

      app.autoResolve({ args: ['request-1'] });

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

      app.autoResolve();
      app.createScope({ tags: ['request'] });

      expect(constructed).toEqual(['Reporter:none', 'Reporter:none']);
    });

    it('should pass args to the scope access rule', function () {
      const seenArgs: unknown[][] = [];

      @register(
        autoResolve(),
        scopeAccess(({ args: accessArgs }) => {
          seenArgs.push(accessArgs);
          return true;
        }),
      )
      class AuditedReporter {}

      new Container({ tags: ['application'] })
        .addRegistration(R.fromClass(AuditedReporter))
        .autoResolve({ args: ['request-1'] });

      expect(seenArgs).toEqual([['request-1']]);
    });

    it('should pass args to the singleton cache key', function () {
      @register(autoResolve(), singleton((tenant) => tenant as string))
      class TenantCache {
        constructor(@inject(arg(0)) readonly tenant: string) {
          constructed.push(`TenantCache:${tenant}`);
        }
      }

      const app = new Container({ tags: ['application'] }).addRegistration(R.fromClass(TenantCache));

      app.autoResolve({ args: ['acme'] });
      app.autoResolve({ args: ['acme'] });
      app.autoResolve({ args: ['globex'] });

      expect(constructed).toEqual(['TenantCache:acme', 'TenantCache:globex']);
    });
  });
});
