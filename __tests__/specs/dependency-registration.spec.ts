import 'reflect-metadata';
import {
  bindTo,
  Container,
  DependencyMissingKeyError,
  register,
  Registration as R,
  scope,
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
      .addRegistration(R.fromClass(Repository).bindToKey('Repository'))
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

    class EmailNotifier implements Notifier {
      channel = 'email';
    }

    class SmsNotifier implements Notifier {
      channel = 'sms';
    }

    const container = new Container()
      .addRegistration(R.fromClass(EmailNotifier).bindTo('EmailNotifier').bindTo(SingleNotifier).bindTo(NotifierGroup))
      .addRegistration(R.fromClass(SmsNotifier).bindTo('SmsNotifier').bindTo(NotifierGroup));

    expect(container.resolve<Notifier>('EmailNotifier').channel).toBe('email');
    expect(SingleNotifier.resolve(container).channel).toBe('email');
    expect(NotifierGroup.resolve(container).map((notifier) => notifier.channel)).toEqual(['email', 'sms']);
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

  it('fails clearly when a registration has no key', () => {
    expect(() => new Container().addRegistration(R.fromValue('missing-key'))).toThrowError(DependencyMissingKeyError);
  });
});
