/** Base class of every error the bundler raises on purpose; the CLI prints its message without a stack. */
export class TicError extends Error {
  name = 'TicError';
}

/** The config file is missing, is not JSON, or does not match the `tic.config.json` shape. */
export class TicConfigError extends TicError {
  name = 'TicConfigError';
}

/** A namespace is neither an existing folder nor a `tsconfig.json` `paths` alias of one. */
export class NamespaceNotFoundError extends TicError {
  name = 'NamespaceNotFoundError';
}
