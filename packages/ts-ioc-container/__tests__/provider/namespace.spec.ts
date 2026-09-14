import 'reflect-metadata';
import {
  bindTo,
  Container,
  DependencyNotFoundError,
  inject,
  namespace,
  Provider,
  ProviderDisposedError,
  register,
  Registration as R,
  SingleToken,
} from '../../lib';

// In a real module these are `__dirname`
const DOMAIN_MODULE = '/app/src/domain/user';
const INFRA_MODULE = '/app/src/infra/http';

describe('namespace access', () => {
  const ILoggerToken = new SingleToken<string>('ILogger');

  it('should grant access to a matching namespace and deny every other one', () => {
    const provider = Provider.fromValue('domain-logger').addNamespaceTemplate('/domain/**');
    const container = new Container();
    const options = { invocationScope: container, providerScope: container, args: [] };

    expect(provider.hasAccess({ ...options, namespace: '/app/src/domain/user/ILogger' })).toBe(true);
    expect(provider.hasAccess({ ...options, namespace: '/app/src/infra/http/ILogger' })).toBe(false);
  });

  it('should deny a resolution which names no namespace at all', () => {
    const provider = Provider.fromValue('domain-logger').addNamespaceTemplate('/domain/**');
    const container = new Container();

    expect(provider.hasAccess({ invocationScope: container, providerScope: container, args: [] })).toBe(false);
  });

  it('should leave an unrestricted provider reachable from everywhere', () => {
    const provider = Provider.fromValue('logger');
    const container = new Container();
    const options = { invocationScope: container, providerScope: container, args: [] };

    expect(provider.hasAccess(options)).toBe(true);
    expect(provider.hasAccess({ ...options, namespace: '/app/src/infra/http/ILogger' })).toBe(true);
  });

  it('should treat several templates as alternatives', () => {
    const provider = Provider.fromValue('logger')
      .addNamespaceTemplate('/domain/**')
      .addNamespaceTemplate('/application/**');
    const container = new Container();
    const options = { invocationScope: container, providerScope: container, args: [] };

    expect(provider.hasAccess({ ...options, namespace: '/app/domain/user/ILogger' })).toBe(true);
    expect(provider.hasAccess({ ...options, namespace: '/app/application/ILogger' })).toBe(true);
    expect(provider.hasAccess({ ...options, namespace: '/app/infra/ILogger' })).toBe(false);
  });

  it('should combine a namespace template with scope access rules', () => {
    const provider = Provider.fromValue('logger')
      .addNamespaceTemplate('/domain/**')
      .addAccessRule(({ invocationScope }) => invocationScope.hasTag('request'));
    const application = new Container({ tags: ['application'] });
    const request = application.createScope({ tags: ['request'] });
    const namespaceName = '/app/domain/user/ILogger';

    expect(
      provider.hasAccess({ invocationScope: request, providerScope: application, args: [], namespace: namespaceName }),
    ).toBe(true);
    expect(
      provider.hasAccess({
        invocationScope: application,
        providerScope: application,
        args: [],
        namespace: namespaceName,
      }),
    ).toBe(false);
  });

  it('should forget namespace templates on disposal', () => {
    const provider = Provider.fromValue('logger').addNamespaceTemplate('/domain/**');

    provider.dispose();

    expect(() =>
      provider.hasAccess({ invocationScope: new Container(), providerScope: new Container(), args: [] }),
    ).toThrowError(ProviderDisposedError);
  });

  it('should serve a registration only to the classes its template covers', () => {
    @register(bindTo(ILoggerToken), namespace('/domain/**'))
    class DomainLogger {
      readonly name = 'domain';
    }

    class UserService {
      constructor(@inject(ILoggerToken.namespace(DOMAIN_MODULE)) readonly logger: DomainLogger) {}
    }

    class HttpClient {
      constructor(@inject(ILoggerToken.namespace(INFRA_MODULE)) readonly logger: DomainLogger) {}
    }

    const container = new Container().addRegistration(R.fromClass(DomainLogger));

    expect(container.resolve(UserService).logger.name).toBe('domain');
    expect(() => container.resolve(HttpClient)).toThrowError(DependencyNotFoundError);
  });

  it('should skip a denied provider in alias-group resolution', () => {
    const container = new Container()
      .addRegistration(R.fromValue('domain-logger').bindToKey('DomainLogger').bindToAlias('logger'))
      .addRegistration(
        R.fromValue('infra-logger').bindToKey('InfraLogger').bindToAlias('logger').pipe(namespace('/infra/**')),
      );

    expect(container.resolveByAlias('logger', { namespace: '/app/domain/user/ILogger' })).toEqual(['domain-logger']);
    expect(container.resolveByAlias('logger', { namespace: '/app/infra/http/ILogger' })).toEqual([
      'domain-logger',
      'infra-logger',
    ]);
  });

  it('should cascade to a parent scope when the nearer provider denies the namespace', () => {
    const application = new Container({ tags: ['application'] }).register(
      'ILogger',
      Provider.fromValue('application-logger'),
    );
    const scope = application
      .createScope({ tags: ['request'] })
      .register('ILogger', Provider.fromValue('domain-logger').addNamespaceTemplate('/domain/**'));

    expect(scope.resolve('ILogger', { namespace: '/app/domain/user/ILogger' })).toBe('domain-logger');
    expect(scope.resolve('ILogger', { namespace: '/app/infra/ILogger' })).toBe('application-logger');
  });
});
