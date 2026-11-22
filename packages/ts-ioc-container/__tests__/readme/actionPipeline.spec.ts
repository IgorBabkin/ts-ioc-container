import 'reflect-metadata';
import {
  by,
  Container,
  decorate,
  getHooks,
  hook,
  HookCollector,
  type HookFn,
  type HookType,
  type IContainer,
  inject,
  type InjectionToken,
  ProxyRegistry,
  register,
  Registration as R,
  runInOrder,
  sequential,
  SingleToken,
  toTask,
} from '../../lib';

/**
 * Declarative action pipeline: guards, body, follow-ups
 *
 * A UI action is rarely just its body. Before it: is the device online, did the
 * user confirm? After it: show a toast, refresh a list. Writing those as guard
 * clauses buries the action; here they are steps in one ordered list on the
 * method, and `execute()` marks where the body runs:
 *
 *   @action(requireState(...), confirm('Retire?'), execute(), notify('Retired'))
 *
 * - `action(...steps)` is one application-defined hook key; `sequential(...)`
 *   runs the steps in order, awaiting any that go async.
 * - A step is a plain `HookFn`. It resolves what it needs from the hook's own
 *   scope (`ctx.scope`), so the controller injects none of it.
 * - A step that throws stops the list: the body and the follow-ups never run.
 * - The `actions()` registration pipe proxies the controller, so a caller just
 *   calls `controller.retire(id)` and the whole list runs. Methods without
 *   `@action` are read straight off the controller.
 *
 * Every step is a pure, separately testable function, and the action's own test
 * covers only what it does once its preconditions hold.
 */

// --- The engine ------------------------------------------------------------

const action = (...steps: HookType[]) => hook('action', sequential(...steps));
const actionHooks = new HookCollector({ key: 'action' });

/** The body's position in the list: calls the method with the caller's args. */
const execute = (): HookFn => (ctx) => {
  const result = ctx.invokeMethod({ args: ctx.getInitialArgs() });
  return result instanceof Promise ? result.then(() => undefined) : undefined;
};

/** Routes every `@action` method through its step list. */
const actions = () =>
  decorate((controller: object, s: IContainer) =>
    ProxyRegistry.getInstance().createProxy(controller, {
      get(target, prop) {
        if (typeof prop !== 'string' || !getHooks(target, 'action').has(prop)) return Reflect.get(target, prop);
        return async (...args: unknown[]) => {
          const steps = actionHooks.getActions(target, {
            scope: s,
            predicate: (method) => method === prop,
            mapExecutionContext: (ctx) => ctx.setInitialArgs(...args),
          });
          await runInOrder(steps.map(toTask));
        };
      },
    }),
  );

// --- Reusable steps --------------------------------------------------------

class ActionNotAllowedError extends Error {}
class UserRejectedError extends Error {}

interface IConnection {
  online: boolean;
}
const IConnectionToken = new SingleToken<IConnection>('IConnection');

interface IDialog {
  confirm(question: string): Promise<boolean>;
}
const IDialogToken = new SingleToken<IDialog>('IDialog');

interface INotifications {
  readonly messages: string[];
}
const INotificationsToken = new SingleToken<INotifications>('INotifications');

const requireState =
  <T>(token: InjectionToken<T>, isAllowed: (dependency: T) => boolean, reason: string): HookFn =>
  (ctx) => {
    if (!isAllowed(token.resolve(ctx.scope))) throw new ActionNotAllowedError(reason);
  };

const confirm =
  (question: string): HookFn =>
  async (ctx) => {
    if (!(await IDialogToken.resolve(ctx.scope).confirm(question))) throw new UserRejectedError(question);
  };

const notify =
  (message: string): HookFn =>
  (ctx) => {
    INotificationsToken.resolve(ctx.scope).messages.push(message);
  };

// --- A controller that reads as its behaviour ------------------------------

interface IStationService {
  retire(stationId: string): Promise<void>;
}
const IStationServiceToken = new SingleToken<IStationService>('IStationService');

const IStationsControllerToken = new SingleToken<StationsController>('IStationsController');

@register(IStationsControllerToken, actions())
class StationsController {
  constructor(@inject(by(IStationServiceToken)) private readonly stations: IStationService) {}

  @action(
    requireState(IConnectionToken, (c) => c.online, 'Station is offline.'),
    confirm('Retire the station?'),
    execute(),
    notify('Station retired'),
  )
  async retire(stationId: string): Promise<void> {
    await this.stations.retire(stationId);
  }

  title(): string {
    return 'Stations';
  }
}

describe('Declarative action pipeline', () => {
  const setup = ({ online = true, answer = true } = {}) => {
    const retired: string[] = [];
    const notifications: INotifications = { messages: [] };
    const container = new Container({ tags: ['page'] })
      .addRegistration(R.fromClass(StationsController))
      .addRegistration(R.fromValue<IConnection>({ online }).bindTo(IConnectionToken))
      .addRegistration(R.fromValue<IDialog>({ confirm: async () => answer }).bindTo(IDialogToken))
      .addRegistration(R.fromValue(notifications).bindTo(INotificationsToken))
      .addRegistration(
        R.fromValue<IStationService>({ retire: async (id) => void retired.push(id) }).bindTo(IStationServiceToken),
      );
    return { controller: IStationsControllerToken.resolve(container), retired, notifications };
  };

  it('runs guards, the body and follow-ups in declaration order', async () => {
    const { controller, retired, notifications } = setup();

    await controller.retire('st-1');

    expect(retired).toEqual(['st-1']);
    expect(notifications.messages).toEqual(['Station retired']);
  });

  it('stops at a failed guard: no body, no follow-up', async () => {
    const { controller, retired, notifications } = setup({ online: false });

    await expect(controller.retire('st-1')).rejects.toBeInstanceOf(ActionNotAllowedError);
    expect(retired).toEqual([]);
    expect(notifications.messages).toEqual([]);
  });

  it('awaits an async step, and a declined confirmation aborts the action', async () => {
    const { controller, retired } = setup({ answer: false });

    await expect(controller.retire('st-1')).rejects.toBeInstanceOf(UserRejectedError);
    expect(retired).toEqual([]);
  });

  it('leaves methods without @action untouched', () => {
    const { controller } = setup();

    expect(controller.title()).toBe('Stations');
  });
});
