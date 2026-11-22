import 'reflect-metadata';
import {
  by,
  Container,
  GroupAliasToken,
  hasHooks,
  hook,
  HookCollector,
  type HookFn,
  type IContainer,
  inject,
  register,
  Registration as R,
  scope,
  select,
  singleton,
  SingleToken,
} from '../../lib';

/**
 * Error bubbling through scopes
 *
 * A frontend opens one scope per level - application, page, widget - and gives
 * each level a controller. An error raised in a widget then bubbles like a DOM
 * event: the widget's controller gets first refusal, then the page's, then the
 * application's. A handler that returns has handled the error; one that
 * re-throws hands it outward - the same error, or a translated one.
 *
 * - `IControllerToken` is a `GroupAliasToken`: resolved from a scope, it yields
 *   the controller of that scope and of every ancestor, innermost first. That
 *   list *is* the bubbling chain - no parent pointers to maintain.
 * - `@onError(...)` is an application-defined hook key; the library only
 *   collects it, and `BubblingErrorHandler` decides how it runs.
 * - Each hook runs in the scope that owns its controller, so a handler resolves
 *   its own dependencies, not the widget's.
 *
 * The same chain works for any "innermost owner wins" rule: request handlers,
 * nested transactions, plugin hosts.
 */

const IControllerToken = new GroupAliasToken<object>('IController');

const onError = (fn: HookFn) => hook('onError', fn);
const onErrorHooks = new HookCollector({ key: 'onError' });

/** The hook body: call the decorated method with the error the chain seeded. */
const handle: HookFn = (ctx) => {
  ctx.invokeMethod({ args: ctx.getInitialArgs() });
};

interface IErrorHandler {
  onError(error: unknown): void;
}
const IErrorHandlerToken = new SingleToken<IErrorHandler>('IErrorHandler');

// No scope(...): built in the scope that bubbles, so it sees that scope's chain.
@register(IErrorHandlerToken)
class BubblingErrorHandler implements IErrorHandler {
  constructor(
    @inject(by(select.scope.current)) private readonly scope: IContainer,
    @inject(by(IControllerToken)) private readonly controllers: object[],
  ) {}

  onError(error: unknown): void {
    let current = error;
    for (const controller of this.controllers) {
      if (!hasHooks(controller, 'onError')) continue;
      try {
        const actions = onErrorHooks.getActions(controller, {
          scope: this.ownerOf(controller),
          mapExecutionContext: (ctx) => ctx.setInitialArgs(current),
        });
        for (const { hook: run, context } of actions) run(context);
        return; // returned: handled here
      } catch (e) {
        current = e; // re-thrown: try the next controller out
      }
    }
    throw current; // nobody owns it
  }

  private ownerOf(instance: object): IContainer {
    for (let s: IContainer | undefined = this.scope; s; s = s.getParent()) {
      if (s.hasInstance(instance)) return s;
    }
    return this.scope;
  }
}

// --- Errors and the controllers that own them ------------------------------

class ValidationError extends Error {}
class NotFoundError extends Error {}
class HttpError extends Error {
  constructor(readonly status: number) {
    super(`HTTP ${status}`);
  }
}
class SessionExpiredError extends Error {}

const perLevel = (tag: string) => scope((s) => s.hasTag(tag));

@register(IControllerToken, perLevel('widget'), singleton())
class FormWidgetController {
  readonly fieldErrors: string[] = [];

  @onError(handle)
  handleError(error: unknown): void {
    if (!(error instanceof ValidationError)) throw error;
    this.fieldErrors.push(error.message);
  }
}

@register(IControllerToken, perLevel('page'), singleton())
class PageController {
  notFound = false;

  @onError(handle)
  handleError(error: unknown): void {
    if (error instanceof NotFoundError) {
      this.notFound = true;
      return;
    }
    // Translate on the way out: the page knows a 401 means the session is gone.
    if (error instanceof HttpError && error.status === 401) throw new SessionExpiredError();
    throw error;
  }
}

@register(IControllerToken, perLevel('application'), singleton())
class AppController {
  redirectedToLogin = false;
  readonly unexpected: unknown[] = [];

  // The catch-all: never re-throws.
  @onError(handle)
  handleError(error: unknown): void {
    if (error instanceof SessionExpiredError) this.redirectedToLogin = true;
    else this.unexpected.push(error);
  }
}

describe('Error bubbling through scopes', () => {
  const createTree = () => {
    const app = new Container({ tags: ['application'] })
      .addRegistration(R.fromClass(BubblingErrorHandler))
      .addRegistration(R.fromClass(AppController))
      .addRegistration(R.fromClass(PageController))
      .addRegistration(R.fromClass(FormWidgetController));
    const page = app.createScope({ tags: ['page'] });
    const widget = page.createScope({ tags: ['widget'] });
    const [form, pageCtrl, appCtrl] = IControllerToken.resolve(widget) as [
      FormWidgetController,
      PageController,
      AppController,
    ];
    return { app, page, widget, form, pageCtrl, appCtrl };
  };

  it('collects the chain innermost first', () => {
    const { form, pageCtrl, appCtrl } = createTree();

    expect(form).toBeInstanceOf(FormWidgetController);
    expect(pageCtrl).toBeInstanceOf(PageController);
    expect(appCtrl).toBeInstanceOf(AppController);
  });

  it('stops at the innermost controller that owns the error', () => {
    const { widget, form, pageCtrl, appCtrl } = createTree();

    IErrorHandlerToken.resolve(widget).onError(new ValidationError('email is required'));

    expect(form.fieldErrors).toEqual(['email is required']);
    expect(pageCtrl.notFound).toBe(false);
    expect(appCtrl.unexpected).toEqual([]);
  });

  it('passes an error the widget does not own up to the page', () => {
    const { widget, pageCtrl, appCtrl } = createTree();

    IErrorHandlerToken.resolve(widget).onError(new NotFoundError());

    expect(pageCtrl.notFound).toBe(true);
    expect(appCtrl.unexpected).toEqual([]);
  });

  it('lets a controller translate the error before passing it on', () => {
    const { widget, appCtrl } = createTree();

    IErrorHandlerToken.resolve(widget).onError(new HttpError(401));

    expect(appCtrl.redirectedToLogin).toBe(true);
  });

  it('ends at the application catch-all', () => {
    const { widget, appCtrl } = createTree();
    const boom = new Error('boom');

    IErrorHandlerToken.resolve(widget).onError(boom);

    expect(appCtrl.unexpected).toEqual([boom]);
  });

  it('starts from the scope that raised it: a page error skips widget controllers', () => {
    const { page, form, pageCtrl } = createTree();

    IErrorHandlerToken.resolve(page).onError(new ValidationError('not mine'));

    expect(form.fieldErrors).toEqual([]);
    expect(pageCtrl.notFound).toBe(false);
  });
});
