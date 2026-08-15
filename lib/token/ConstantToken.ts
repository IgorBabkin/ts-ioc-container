import type { IContainer } from '../container/IContainer';
import { InjectionToken } from './InjectionToken';
import { MethodNotImplementedError } from '../errors/MethodNotImplementedError';

export class ConstantToken<T = any> extends InjectionToken<T> {
  constructor(private readonly token: T) {
    super();
  }

  resolve(s: IContainer): T {
    return this.token;
  }

  /**
   * @throws {MethodNotImplementedError} always — a constant token cannot receive static args.
   */
  args(...deps: unknown[]): InjectionToken<T> {
    throw new MethodNotImplementedError('not implemented');
  }

  /**
   * @throws {MethodNotImplementedError} always — a constant token cannot receive resolved args.
   */
  argsFn(getArgsFn: (s: IContainer) => unknown[]): InjectionToken<T> {
    throw new MethodNotImplementedError('not implemented');
  }

  /**
   * @throws {MethodNotImplementedError} always — a constant token cannot be made lazy.
   */
  lazy(): InjectionToken<T> {
    throw new MethodNotImplementedError('not implemented');
  }
}
