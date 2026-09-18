import type { IContainer } from '../container/IContainer';
import { InjectionToken } from './InjectionToken';
import { MethodNotImplementedError } from '../errors/MethodNotImplementedError';
import { Serializable } from '../utils/basic';

export class ConstantToken<T = any> extends InjectionToken<T> implements Serializable {
  constructor(
    private readonly token: T,
    { tags = [] }: { tags?: string[] } = {},
  ) {
    super(tags);
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

  addTags(...tags: string[]): ConstantToken<T> {
    return new ConstantToken<T>(this.token, { tags: [...this.getTags(), ...tags] });
  }

  /**
   * @throws {MethodNotImplementedError} always — a constant token has no underlying key.
   */
  toString(): string {
    throw new MethodNotImplementedError('not implemented');
  }
}
