import 'reflect-metadata';
import {
  autoResolve,
  AutoResolveModule,
  bindTo,
  Container,
  type IContainer,
  register,
  Registration as R,
  scope,
  singleton,
} from '../../lib';

/**
 * User Management Domain - Eager Services
 *
 * Some services are never injected anywhere: they subscribe to a queue, start a
 * timer, or warm a cache as soon as their scope exists. Nothing resolves them,
 * so lazy resolution would never create them at all.
 *
 * `autoResolve()` marks such a provider as eager, and `AutoResolveModule`
 * resolves every eager provider of a scope right after the scope is created.
 */

const auditTrail: string[] = [];

// Started for every request, even though no other class injects it
@register(bindTo('IRequestAuditor'), scope((s) => s.hasTag('request')), autoResolve(), singleton())
class RequestAuditor {
  constructor() {
    auditTrail.push('request started');
  }
}

// Resolved on demand, the usual way
@register(bindTo('IUserRepository'), singleton())
class UserRepository {
  findById(id: string): string {
    return `user_${id}`;
  }
}

describe('Auto resolve', function () {
  function createAppContainer(): IContainer {
    return new Container({ tags: ['application'] })
      .useModule(new AutoResolveModule())
      .addRegistration(R.fromClass(RequestAuditor))
      .addRegistration(R.fromClass(UserRepository));
  }

  beforeEach(() => {
    auditTrail.length = 0;
  });

  it('should create eager services as soon as a scope is created', function () {
    const app = createAppContainer();

    // Nothing has been created yet - the application container is not a created scope
    expect(auditTrail).toEqual([]);

    app.createScope({ tags: ['request'] });
    app.createScope({ tags: ['request'] });

    // One auditor per request scope, without anybody resolving it
    expect(auditTrail).toEqual(['request started', 'request started']);
  });

  it('should reuse the eagerly created instance', function () {
    const requestScope = createAppContainer().createScope({ tags: ['request'] });

    const auditor = requestScope.resolve<RequestAuditor>('IRequestAuditor');

    expect(auditTrail).toEqual(['request started']);
    expect(requestScope.resolve<RequestAuditor>('IRequestAuditor')).toBe(auditor);
  });

  it('should leave other providers lazy', function () {
    const requestScope = createAppContainer().createScope({ tags: ['request'] });

    expect(requestScope.resolve<UserRepository>('IUserRepository').findById('1')).toBe('user_1');
  });
});
