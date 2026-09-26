/**
 * Base class of every error the container throws. `code` is stable across
 * versions (unlike `message`), so match on it — or on the subclass — rather
 * than on the text. The codes are listed in the package's AGENTS.md.
 */
export abstract class ContainerError extends Error {
  name = 'ContainerError';
  readonly code: string = 'IOC_CONTAINER_ERROR';

  protected constructor(message?: string) {
    super(message);

    Object.setPrototypeOf(this, ContainerError.prototype);
  }
}
