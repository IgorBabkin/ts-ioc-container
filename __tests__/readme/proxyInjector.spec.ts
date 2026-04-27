import { bindTo, Container, ProxyInjector, register, Registration as R } from '../../lib';

describe('ProxyInjector', function () {
  it('should inject dependencies as a props object', function () {
    @register(bindTo('logger'))
    class Logger {
      log(msg: string) {
        return `Logged: ${msg}`;
      }
    }

    class UserController {
      private logger: Logger;
      private prefix: string;

      constructor({ logger, prefix }: { logger: Logger; prefix: string }) {
        this.logger = logger;
        this.prefix = prefix;
      }

      createUser(name: string): string {
        return this.logger.log(`${this.prefix} ${name}`);
      }
    }

    const container = new Container({ injector: new ProxyInjector() })
      .addRegistration(R.fromClass(Logger))
      .addRegistration(R.fromValue('USER:').bindToKey('prefix'))
      .addRegistration(R.fromClass(UserController));

    expect(container.resolve<UserController>('UserController').createUser('bob')).toBe('Logged: USER: bob');
  });

  it('should expose runtime args through the reserved "args" property', function () {
    class ReportGenerator {
      format: string;

      constructor({ args }: { args: string[] }) {
        this.format = args[0];
      }

      generate(): string {
        return `Report in ${this.format}`;
      }
    }

    const container = new Container({ injector: new ProxyInjector() }).addRegistration(R.fromClass(ReportGenerator));

    const generator = container.resolve<ReportGenerator>('ReportGenerator', { args: ['PDF'] });

    expect(generator.generate()).toBe('Report in PDF');
  });
});
