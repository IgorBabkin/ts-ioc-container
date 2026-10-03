/**
 * Base class of every error the bundler raises on purpose. `code` is a stable,
 * machine-readable identifier; the CLI prints the message without a stack.
 */
export abstract class TicError extends Error {
  protected constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

/** The config file is missing, is not JSON, or does not match the `tic.config.json` shape. */
export class TicConfigError extends TicError {
  constructor(message: string) {
    super('INVALID_CONFIG', message);
  }
}

/** A namespace is neither an existing folder nor a `tsconfig.json` `paths` alias of one. */
export class NamespaceNotFoundError extends TicError {
  constructor(message: string) {
    super('NAMESPACE_NOT_FOUND', message);
  }
}

/** The command line names no command. */
export class MissingCommandError extends TicError {
  constructor(usage: string) {
    super('MISSING_COMMAND', `missing command\n${usage}`);
  }
}

/** The command line names a command no controller is registered for. */
export class UnknownCommandError extends TicError {
  constructor(command: string) {
    super('UNKNOWN_COMMAND', `unknown command "${command}"`);
  }
}

/** The command line names an action the command's controller does not declare. */
export class UnknownActionError extends TicError {
  constructor(command: string, action: string) {
    super('UNKNOWN_ACTION', `unknown action "${action}" for command "${command}"`);
  }
}

/** A command's options are malformed: an unknown flag, or a flag missing its value. */
export class UsageError extends TicError {
  constructor(message: string) {
    super('USAGE', message);
  }
}
