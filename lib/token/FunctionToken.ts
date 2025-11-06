import type { IContainer } from '../container/IContainer';
import { InjectionToken } from './InjectionToken';
import { MethodNotImplementedError } from '../errors/MethodNotImplementedError';
import { InjectFn } from '../hooks/hook';

export class FunctionToken<T = any> extends InjectionToken<T> {
  constructor(private readonly fn: InjectFn<T>) {
    super();
  }

  resolve(s: IContainer): T {
    return this.fn(s);
  }

  args(...deps: unknown[]): InjectionToken<T> {
    throw new MethodNotImplementedError('not implemented');
  }

  argsFn(getArgsFn: (s: IContainer) => unknown[]): InjectionToken<T> {
    throw new MethodNotImplementedError('not implemented');
  }

  lazy(): InjectionToken<T> {
    throw new MethodNotImplementedError('not implemented');
  }
}
