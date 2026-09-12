import 'reflect-metadata';
import {
  bindTo,
  Container,
  DependencyNotFoundError,
  inject,
  namespace,
  register,
  Registration as R,
  singleton,
  SingleToken,
} from '../../lib';

/**
 * User Management Domain - Module Boundaries
 *
 * A namespace is where a dependency is resolved from: the module path a token
 * was given - `__dirname` in a real module - plus its key.
 *
 * `namespace(...)` restricts a registration to the module tree its template
 * covers, so the domain layer gets the domain logger and nothing else can
 * reach it. This is architecture enforced by the container:
 * - layers stay separated without a lint rule
 * - one key can mean a different implementation per module tree
 * - misuse fails at resolution time, where it is easy to see
 */
describe('Namespace', function () {
  // In a real module these are `__dirname`
  const DOMAIN_MODULE = '/app/src/domain/user';
  const INFRA_MODULE = '/app/src/infra/http';

  interface ILogger {
    log(message: string): string;
  }

  const ILoggerToken = new SingleToken<ILogger>('ILogger');

  it('should serve a registration only to the classes its template covers', () => {
    // Only classes under a `domain` directory can resolve this logger
    @register(bindTo(ILoggerToken), namespace('/domain/**'), singleton())
    class DomainLogger implements ILogger {
      log(message: string): string {
        return `[domain] ${message}`;
      }
    }

    // /app/src/domain/user/UserService.ts
    class UserService {
      constructor(@inject(ILoggerToken.namespace(DOMAIN_MODULE)) private logger: ILogger) {}

      createUser(name: string): string {
        return this.logger.log(`created ${name}`);
      }
    }

    // /app/src/infra/http/HttpClient.ts
    class HttpClient {
      constructor(@inject(ILoggerToken.namespace(INFRA_MODULE)) readonly logger: ILogger) {}
    }

    const container = new Container().addRegistration(R.fromClass(DomainLogger));

    // The domain sees its logger
    expect(container.resolve(UserService).createUser('Bob')).toBe('[domain] created Bob');

    // The infrastructure layer does not - the domain logger is private to `/domain/**`
    expect(() => container.resolve(HttpClient)).toThrowError(DependencyNotFoundError);
  });

  it('should keep a module-internal dependency private to its own module', () => {
    const IUserRepositoryToken = new SingleToken<UserRepository>('IUserRepository');

    // Nothing outside `/domain/user` has any business touching this repository
    @register(bindTo(IUserRepositoryToken), namespace('/domain/user/**'), singleton())
    class UserRepository {
      findById(id: string): string {
        return `user ${id}`;
      }
    }

    const container = new Container().addRegistration(R.fromClass(UserRepository));

    expect(IUserRepositoryToken.namespace(DOMAIN_MODULE).resolve(container).findById('1')).toBe('user 1');

    // A sibling module cannot reach it, even though it knows the key
    expect(() => IUserRepositoryToken.namespace('/app/src/domain/billing').resolve(container)).toThrowError(
      DependencyNotFoundError,
    );
  });
});
