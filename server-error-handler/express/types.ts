import type { Request, Response } from 'express';

/**
 * Context passed to error handlers in Express.
 */
export interface ExpressContext {
  req: Request;
  reply: Response;
}

/**
 * Interface for error handlers.
 * Implement this interface to create custom error handlers that can be
 * registered with the container and used by the error handling middleware.
 */
export interface IErrorHandler<E = unknown> {
  /**
   * Priority of the handler. Handlers with higher priority are checked first.
   * Default handlers should use low priority (e.g., 0).
   */
  priority: number;

  /**
   * Check if this handler can handle the given error.
   * @param error - The error to check
   * @returns true if this handler can handle the error
   */
  match(error: unknown): boolean;

  /**
   * Handle the error.
   * @param error - The error to handle
   * @param context - The Express context (req, reply)
   */
  handle(error: E, context: ExpressContext): void | Promise<void>;
}
