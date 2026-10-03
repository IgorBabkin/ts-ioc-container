import { createHookContextFactory, HookCollector, type IContainer, toTask } from 'ts-ioc-container';
import { MissingCommandError, UnknownActionError, UnknownCommandError } from '../exceptions/DomainException';
import { DEFAULT_ACTION } from './decorators';
import { type IErrorHandler, IErrorHandlerKey } from './IErrorHandler';
import { USAGE } from './usage';

/** Flags that stand for a whole command: `tic --help` runs `tic help`. */
const COMMAND_ALIASES: Record<string, string> = {
  '--help': 'help',
  '-h': 'help',
  '--version': 'version',
  '-v': 'version',
};

/**
 * Splits `<command> [action] [--flags...]` into its leading positionals. A flag in
 * the action position leaves the action unset, so `tic build --check` runs the
 * default action rather than one called `--check`. A word in that position is only a
 * candidate: when the controller declares no such action it is an argument of the
 * default action (`tic build src/di/app.bundle.ts`).
 *
 * @throws {MissingCommandError} when `argv` is empty.
 */
function parseCommandAndAction(argv: string[]): { command: string; action: string } {
  const [first, maybeAction] = argv;
  if (!first) throw new MissingCommandError(USAGE);
  const command = COMMAND_ALIASES[first] ?? first;
  const action = maybeAction && !maybeAction.startsWith('-') ? maybeAction : DEFAULT_ACTION;
  return { command, action };
}

/**
 * Runs one command line against a container: resolves the controller registered
 * under the command's name, runs the hooks it declares under the action, and routes
 * failures to the bound {@link IErrorHandler}. Each action method reads its own
 * options from the raw command line, which reaches it as the hook's runtime args.
 */
export class Application {
  static bootstrap(container: IContainer): Application {
    return new Application(container, IErrorHandlerKey.resolve(container));
  }

  private constructor(
    private readonly scope: IContainer,
    private readonly errorHandler: IErrorHandler,
  ) {}

  /** Runs `argv` and returns the exit code; the container is disposed afterwards. */
  run(...argv: string[]): number {
    try {
      const { command, action } = parseCommandAndAction(argv);
      if (!this.scope.hasRegistration(command)) throw new UnknownCommandError(command);
      const controller = this.scope.resolve<object>(command);
      const actionsOf = (key: string) =>
        new HookCollector({ key, createExecutionContext: createHookContextFactory({ args: argv }) }).getActions(
          controller,
          { scope: this.scope },
        );
      let actions = actionsOf(action);
      // Not a declared action: the word is the default action's first argument.
      if (actions.length === 0 && action !== DEFAULT_ACTION) actions = actionsOf(DEFAULT_ACTION);
      if (actions.length === 0) throw new UnknownActionError(command, action);
      for (const item of actions) toTask(item)();
      return 0;
    } catch (error) {
      return this.errorHandler.handleError(error);
    } finally {
      this.scope.dispose();
    }
  }
}
