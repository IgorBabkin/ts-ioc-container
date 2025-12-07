import 'reflect-metadata';
import { Container, ContainerDisposedError, Registration as R, select } from '../../lib';

/**
 * User Management Domain - Resource Cleanup
 *
 * When a scope ends (e.g., HTTP request completes), resources must be cleaned up:
 * - Database connections returned to pool
 * - File handles closed
 * - Temporary files deleted
 * - Cache entries cleared
 *
 * The container.dispose() method:
 * 1. Executes all onDispose hooks
 * 2. Clears all instances and registrations
 * 3. Detaches from parent scope
 * 4. Prevents further resolution
 */

// Simulates a database connection that must be closed
class DatabaseConnection {
  isClosed = false;

  query(sql: string): string[] {
    if (this.isClosed) {
      throw new Error('Connection is closed');
    }
    return [`Result for: ${sql}`];
  }

  close(): void {
    this.isClosed = true;
  }
}

describe('Disposing', function () {
  it('should dispose container and prevent further usage', function () {
    const appContainer = new Container({ tags: ['application'] }).addRegistration(
      R.fromClass(DatabaseConnection).bindTo('IDatabase'),
    );

    // Create a request scope with a database connection
    const requestScope = appContainer.createScope({ tags: ['request'] });
    const connection = requestScope.resolve<DatabaseConnection>('IDatabase');

    // Connection works normally
    expect(connection.query('SELECT * FROM users')).toEqual(['Result for: SELECT * FROM users']);

    // Request ends - dispose the scope
    requestScope.dispose();

    // Scope is now unusable
    expect(() => requestScope.resolve('IDatabase')).toThrow(ContainerDisposedError);

    // All instances are cleared
    expect(select.instances().resolve(requestScope).length).toBe(0);

    // Application container is still functional
    expect(appContainer.resolve<DatabaseConnection>('IDatabase')).toBeDefined();
  });

  it('should clean up request-scoped resources on request end', function () {
    const appContainer = new Container({ tags: ['application'] }).addRegistration(
      R.fromClass(DatabaseConnection).bindTo('IDatabase'),
    );

    // Simulate Express.js request lifecycle
    function handleRequest(): { connection: DatabaseConnection; scope: Container } {
      const requestScope = appContainer.createScope({ tags: ['request'] }) as Container;
      const connection = requestScope.resolve<DatabaseConnection>('IDatabase');

      // Do some work...
      connection.query('INSERT INTO sessions VALUES (...)');

      return { connection, scope: requestScope };
    }

    // Request 1
    const request1 = handleRequest();
    expect(request1.connection.isClosed).toBe(false);

    // Request 1 ends - in Express, this would be in res.on('finish')
    request1.connection.close();
    request1.scope.dispose();

    // Request 2 gets a fresh connection
    const request2 = handleRequest();
    expect(request2.connection.isClosed).toBe(false);
    expect(request2.connection).not.toBe(request1.connection);

    // Cleanup
    request2.connection.close();
    request2.scope.dispose();
  });
});
