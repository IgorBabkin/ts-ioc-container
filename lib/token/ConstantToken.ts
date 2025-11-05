import type { IContainer } from '../container/IContainer';
import { InjectionToken } from './InjectionToken';

export class ConstantToken<T = any> extends InjectionToken<T> {
  constructor(private readonly token: T) {
    super();
  }

  resolve(s: IContainer): T {
    return this.token;
  }

  args(...deps: unknown[]): InjectionToken<T> {
    throw new Error('not implemented');
  }

  argsFn(getArgsFn: (s: IContainer) => unknown[]): InjectionToken<T> {
    throw new Error('not implemented');
  }

  lazy(): InjectionToken<T> {
    throw new Error('not implemented');
  }
}
