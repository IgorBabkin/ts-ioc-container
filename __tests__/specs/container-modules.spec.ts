import 'reflect-metadata';
import {
  AddOnConstructHookModule,
  Container,
  type IContainer,
  type IContainerModule,
  onConstruct,
  Registration as R,
  singleton,
} from '../../lib';

describe('Spec: container modules', () => {
  it('applies reusable module configuration to a container', () => {
    class Logger {
      readonly name = 'logger';
    }

    class LoggingModule implements IContainerModule {
      applyTo(container: IContainer): void {
        container.addRegistration(R.fromClass(Logger).bindToKey('Logger'));
      }
    }

    const container = new Container();

    expect(container.useModule(new LoggingModule())).toBe(container);
    expect(container.resolve<Logger>('Logger').name).toBe('logger');
  });

  it('composes feature and environment modules without removing earlier registrations', () => {
    class StrictAuth {
      readonly mode = 'strict';
    }

    class PaymentsClient {
      readonly name = 'payments';
    }

    class AuthModule implements IContainerModule {
      applyTo(container: IContainer): void {
        container.addRegistration(R.fromClass(StrictAuth).bindToKey('Auth'));
      }
    }

    class PaymentsModule implements IContainerModule {
      applyTo(container: IContainer): void {
        container.addRegistration(R.fromClass(PaymentsClient).bindToKey('PaymentsClient'));
      }
    }

    const container = new Container().useModule(new AuthModule()).useModule(new PaymentsModule());

    expect(container.resolve<StrictAuth>('Auth').mode).toBe('strict');
    expect(container.resolve<PaymentsClient>('PaymentsClient').name).toBe('payments');
  });

  it('enables lifecycle behavior through modules and child scope inheritance', () => {
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
      .useModule(new AddOnConstructHookModule())
      .addRegistration(R.fromClass(FeatureService).bindToKey('FeatureService').pipe(singleton()));
    const request = app.createScope({ tags: ['request'] });

    expect(request.resolve<FeatureService>('FeatureService').started).toBe(true);
  });
});
