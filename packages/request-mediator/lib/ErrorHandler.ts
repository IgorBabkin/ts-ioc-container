type constructor<T> = new (...args: any[]) => T;

export interface IErrorHandler<Context = undefined> {
  handle(error: unknown, context: Context): void;
}

export abstract class ErrorHandler<Context> implements IErrorHandler<Context> {
  protected abstract errors: constructor<Error>[];

  constructor(private handler: IErrorHandler<Context>) {}

  handle(error: unknown, context: Context): void {
    return this.matchError(error) ? this.handleError(error, context) : this.handler.handle(error, context);
  }

  protected abstract handleError(error: Error, context: Context): void;

  private matchError(error: unknown): error is Error {
    return this.errors.some((it) => {
      return error instanceof it;
    });
  }
}
