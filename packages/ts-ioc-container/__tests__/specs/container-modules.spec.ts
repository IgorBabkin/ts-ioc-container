import 'reflect-metadata';
import {
  OnConstructModule,
  autoResolve,
  AutoResolveModule,
  bindTo,
  Container,
  type IContainer,
  type IContainerModule,
  onConstruct,
  register,
  Registration as R,
  scopeAccess,
  SequentialSync,
  singleton,
} from '../../lib';

describe('Spec: container modules', () => {
  it('applies reusable module configuration to a container', () => {
    class Logger {
      readonly name = 'logger';
    }

    class LoggingModule implements IContainerModule {
      applyTo(container: IContainer): void {
        container.addRegistration(R.fromClass(Logger));
      }
    }

    const container = new Container();

    expect(container.useModule(new LoggingModule())).toBe(container);
    expect(container.resolve<Logger>('Logger').name).toBe('logger');
  });

  it('composes feature and environment modules without removing earlier registrations', () => {
    @register(bindTo('Auth'))
    class StrictAuth {
      readonly mode = 'strict';
    }

    class PaymentsClient {
      readonly name = 'payments';
    }

    class AuthModule implements IContainerModule {
      applyTo(container: IContainer): void {
        container.addRegistration(R.fromClass(StrictAuth));
      }
    }

    class PaymentsModule implements IContainerModule {
      applyTo(container: IContainer): void {
        container.addRegistration(R.fromClass(PaymentsClient));
      }
    }

    const container = new Container().useModule(new AuthModule()).useModule(new PaymentsModule());

    expect(container.resolve<StrictAuth>('Auth').mode).toBe('strict');
    expect(container.resolve<PaymentsClient>('PaymentsClient').name).toBe('payments');
  });

  it('enables lifecycle behavior through modules and child scope inheritance', () => {
    @register(singleton())
    class FeatureService {
      started = false;

      @onConstruct((context) => {
        context.invokeMethod();
      })
      start(): void {
        this.started = true;
      }
    }

    const app = new Container()
      .useModule(new OnConstructModule(new SequentialSync({ key: 'onConstruct' })))
      .addRegistration(R.fromClass(FeatureService));
    const request = app.createScope({ tags: ['request'] });

    expect(request.resolve<FeatureService>('FeatureService').started).toBe(true);
  });

  it('eagerly instantiates scope services through a module', () => {
    const started: string[] = [];

    @register(autoResolve(), singleton())
    class Heartbeat {
      constructor() {
        started.push('heartbeat');
      }
    }

    @register(autoResolve(), scopeAccess(({ invocationScope }) => invocationScope.hasTag('admin')))
    class AdminConsole {
      constructor() {
        started.push('admin-console');
      }
    }

    const app = new Container({ tags: ['application'] })
      .useModule(new AutoResolveModule())
      .addRegistration(R.fromClass(Heartbeat))
      .addRegistration(R.fromClass(AdminConsole));

    expect(started).toEqual([]);

    const request = app.createScope({ tags: ['request'] });

    expect(started).toEqual(['heartbeat']);

    request.createScope({ tags: ['transaction'] });

    expect(started).toEqual(['heartbeat', 'heartbeat']);

    app.createScope({ tags: ['request', 'admin'] });

    expect(started).toEqual(['heartbeat', 'heartbeat', 'heartbeat', 'admin-console']);
  });
});
