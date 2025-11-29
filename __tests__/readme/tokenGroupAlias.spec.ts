import { bindTo, Container, GroupAliasToken, inject, register, Registration as R } from '../../lib';

const IMiddlewareToken = new GroupAliasToken('IMiddleware');

interface IMiddleware {
  apply(): void;
}

@register(bindTo(IMiddlewareToken))
class LoggerMiddleware implements IMiddleware {
  apply() {
    console.log('Logger middleware');
  }
}

@register(bindTo(IMiddlewareToken))
class AuthMiddleware implements IMiddleware {
  apply() {
    console.log('Auth middleware');
  }
}

class App {
  constructor(@inject(IMiddlewareToken) public middleware: IMiddleware[]) {}

  run() {
    this.middleware.forEach((m) => m.apply());
  }
}

describe('GroupAliasToken', function () {
  it('should resolve multiple implementations by alias', function () {
    const container = new Container()
      .addRegistration(R.fromClass(LoggerMiddleware))
      .addRegistration(R.fromClass(AuthMiddleware));

    const app = container.resolve(App);
    app.run(); // Both middleware are applied
    expect(app.middleware.length).toBe(2);
  });
});
