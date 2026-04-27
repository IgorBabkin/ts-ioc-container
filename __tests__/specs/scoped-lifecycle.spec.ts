import 'reflect-metadata';
import {
  bindTo,
  Container,
  ContainerDisposedError,
  DependencyNotFoundError,
  register,
  Registration as R,
  scope,
  singleton,
} from '../../lib';

@register(bindTo('Session'), scope((container) => container.hasTag('request')), singleton())
class Session {
  private userId: string | undefined;

  setCurrentUser(userId: string): void {
    this.userId = userId;
  }

  getCurrentUser(): string | undefined {
    return this.userId;
  }
}

class RequestConfiguration {
  readonly baseUrl = '/api';
}

describe('Spec: scoped lifecycle', () => {
  it('isolates request-scoped singleton instances between matching child scopes', () => {
    const app = new Container({ tags: ['application'] }).addRegistration(R.fromClass(Session));
    const request1 = app.createScope({ tags: ['request'] });
    const request2 = app.createScope({ tags: ['request'] });

    const session1 = request1.resolve<Session>('Session');
    const session1Again = request1.resolve<Session>('Session');
    const session2 = request2.resolve<Session>('Session');

    session1.setCurrentUser('user-1');
    session2.setCurrentUser('user-2');

    expect(() => app.resolve('Session')).toThrowError(DependencyNotFoundError);
    expect(session1).toBe(session1Again);
    expect(session1).not.toBe(session2);
    expect(session1.getCurrentUser()).toBe('user-1');
    expect(session2.getCurrentUser()).toBe('user-2');
  });

  it('allows an existing child scope to resolve later unscoped parent registrations', () => {
    const app = new Container({ tags: ['application'] });
    const request = app.createScope({ tags: ['request'] });

    app.addRegistration(R.fromClass(RequestConfiguration));

    expect(request.resolve<RequestConfiguration>('RequestConfiguration').baseUrl).toBe('/api');
  });

  it('does not retroactively apply late scoped registrations to existing child scopes', () => {
    @register(bindTo('RequestId'), scope((container) => container.hasTag('request')))
    class RequestId {}

    const app = new Container({ tags: ['application'] });
    const existingRequest = app.createScope({ tags: ['request'] });

    app.addRegistration(R.fromClass(RequestId));

    const freshRequest = app.createScope({ tags: ['request'] });

    expect(() => existingRequest.resolve('RequestId')).toThrowError(DependencyNotFoundError);
    expect(freshRequest.resolve('RequestId')).toBeInstanceOf(RequestId);
  });

  it('adds tags dynamically and uses them for scope matching', () => {
    @register(bindTo('FeatureService'), scope((container) => container.hasTag('feature')))
    class FeatureService {}

    const app = new Container();
    app.addTags('feature');
    app.addRegistration(R.fromClass(FeatureService));

    expect(app.hasTag('feature')).toBe(true);
    expect(app.resolve('FeatureService')).toBeInstanceOf(FeatureService);
  });

  it('does not include child-scope instances in the parent own tracked collection', () => {
    const app = new Container({ tags: ['application'] }).addRegistration(R.fromClass(RequestConfiguration));
    const request = app.createScope({ tags: ['request'] });

    const childInstance = request.resolve<RequestConfiguration>('RequestConfiguration');

    expect(app.getInstances()).not.toContain(childInstance);
    expect(request.getInstances()).toContain(childInstance);
  });

  it('disposes a child scope without breaking the parent container', () => {
    const app = new Container({ tags: ['application'] }).addRegistration(R.fromClass(RequestConfiguration));
    const request = app.createScope({ tags: ['request'] });

    const requestConfiguration = request.resolve<RequestConfiguration>('RequestConfiguration');

    expect(request.getInstances()).toContain(requestConfiguration);

    request.dispose();

    expect(request.isDisposed).toBe(true);
    expect(request.getInstances()).toEqual([]);
    expect(() => request.resolve('RequestConfiguration')).toThrowError(ContainerDisposedError);
    expect(app.resolve<RequestConfiguration>('RequestConfiguration').baseUrl).toBe('/api');
  });
});
