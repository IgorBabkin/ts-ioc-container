import 'reflect-metadata';
import {
  bindTo,
  Container,
  DependencyMissingKeyError,
  register,
  Registration as R,
  scope,
  SingleToken,
  toGroupAlias,
  toSingleAlias,
} from '../../lib';

describe('Spec: dependency registration', () => {
  it('registers classes, values, factories, and key redirects through one model', () => {
    class Repository {
      readonly source = 'db';
    }

    class Service {
      constructor(readonly repository: Repository) {}
    }

    const container = new Container()
      .addRegistration(R.fromClass(Repository))
      .addRegistration(R.fromValue({ env: 'test' }).bindToKey('Config'))
      .addRegistration(R.fromFn((scope) => new Service(scope.resolve('Repository'))).bindToKey('Service'))
      .addRegistration(R.fromKey<Service>('Service').bindToKey('ServiceAlias'));

    expect(container.resolve<Repository>('Repository').source).toBe('db');
    expect(container.resolve<{ env: string }>('Config').env).toBe('test');
    expect(container.resolve<Service>('ServiceAlias').repository).toBeInstanceOf(Repository);
  });

  it('binds registrations to direct keys, single aliases, and group aliases', () => {
    const SingleNotifier = toSingleAlias<Notifier>('SingleNotifier');
    const NotifierGroup = toGroupAlias<Notifier>('NotifierGroup');

    interface Notifier {
      channel: string;
    }

    @register(bindTo(SingleNotifier), bindTo(NotifierGroup))
    class EmailNotifier implements Notifier {
      channel = 'email';
    }

    @register(bindTo(NotifierGroup))
    class SmsNotifier implements Notifier {
      channel = 'sms';
    }

    const container = new Container()
      .addRegistration(R.fromClass(EmailNotifier))
      .addRegistration(R.fromClass(SmsNotifier));

    expect(container.resolve<Notifier>('EmailNotifier').channel).toBe('email');
    expect(SingleNotifier.resolve(container).channel).toBe('email');
    expect(NotifierGroup.resolve(container).map((notifier) => notifier.channel)).toEqual(['email', 'sms']);
  });

  it('binds directly to an injection token passed to @register, without wrapping it in bindTo()', () => {
    const LoggerToken = new SingleToken<Logger>('ILogger');

    interface Logger {
      log(msg: string): void;
    }

    @register(LoggerToken)
    class ConsoleLogger implements Logger {
      log(msg: string) {
        return msg;
      }
    }

    const container = new Container().addRegistration(R.fromClass(ConsoleLogger));

    expect(LoggerToken.resolve(container)).toBeInstanceOf(ConsoleLogger);
  });

  it('binds directly to a plain DependencyKey passed to @register, without wrapping it in bindTo()', () => {
    @register('PlainKeyLogger')
    class ConsoleLogger {}

    const container = new Container().addRegistration(R.fromClass(ConsoleLogger));

    expect(container.resolve('PlainKeyLogger')).toBeInstanceOf(ConsoleLogger);
  });

  it('applies decorator mappers and default class-name keys', () => {
    @register()
    class DefaultPlugin {
      readonly name = 'default';
    }

    @register(bindTo('Auditable'), bindTo(toGroupAlias('Plugin')))
    class AuditPlugin {
      readonly name = 'audit';
    }

    const container = new Container()
      .addRegistration(R.fromClass(DefaultPlugin))
      .addRegistration(R.fromClass(AuditPlugin));

    expect(container.resolve<DefaultPlugin>('DefaultPlugin').name).toBe('default');
    expect(container.resolve<AuditPlugin>('Auditable')).toBeInstanceOf(AuditPlugin);
    expect(container.resolveByAlias<AuditPlugin>('Plugin')[0]).toBeInstanceOf(AuditPlugin);
  });

  it('applies scoped registrations only to matching containers', () => {
    @register(bindTo('RequestContext'), scope((container) => container.hasTag('request')))
    class RequestContext {
      readonly id = 'request';
    }

    const app = new Container({ tags: ['application'] }).addRegistration(R.fromClass(RequestContext));
    const request = app.createScope({ tags: ['request'] });

    expect(app.hasRegistration('RequestContext')).toBe(true);
    expect(() => app.resolve('RequestContext')).toThrowError();
    expect(request.resolve<RequestContext>('RequestContext').id).toBe('request');
  });

  it('lets a later registration silently win when two classes derive the same string key', () => {
    class Report {
      readonly kind = 'first';
    }

    class Summary {
      readonly kind = 'second';
    }
    // What a minifier does routinely, and what two same-named classes in
    // different modules do by hand.
    Object.defineProperty(Summary, 'name', { value: 'Report' });

    const container = new Container().addRegistration(R.fromClass(Report)).addRegistration(R.fromClass(Summary));

    // Both registered under 'Report'; the second overwrote the first.
    expect(container.resolve<Report>('Report').kind).toBe('second');

    // Resolving by constructor is unaffected — that path is keyed by the class itself.
    expect(container.resolve(Report).kind).toBe('first');
    expect(container.resolve(Summary).kind).toBe('second');
  });

  it('keeps two same-named classes apart when each binds to a symbol token', () => {
    const ReportToken = new SingleToken<{ kind: string }>(Symbol('Report'));
    const SummaryToken = new SingleToken<{ kind: string }>(Symbol('Report'));

    @register(bindTo(ReportToken))
    class Report {
      readonly kind = 'first';
    }

    @register(bindTo(SummaryToken))
    class Summary {
      readonly kind = 'second';
    }
    Object.defineProperty(Summary, 'name', { value: 'Report' });

    const container = new Container().addRegistration(R.fromClass(Report)).addRegistration(R.fromClass(Summary));

    // Same description, distinct symbols — no collision.
    expect(ReportToken.resolve(container).kind).toBe('first');
    expect(SummaryToken.resolve(container).kind).toBe('second');
  });

  it('fails clearly when a registration has no key', () => {
    expect(() => new Container().addRegistration(R.fromValue('missing-key'))).toThrowError(DependencyMissingKeyError);
  });
});
