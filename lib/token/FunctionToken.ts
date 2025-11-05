import type { InjectFn } from '../hooks/HookContext';
import type { IContainer } from '../container/IContainer';
import { InjectionToken } from './InjectionToken';

export class FunctionToken<T = any> extends InjectionToken<T> {
  constructor(private readonly fn: InjectFn<T>) {
    super();
  }

  resolve(s: IContainer): T {
    return this.fn(s);
  }

  args(...deps: unknown[]): InjectionToken<T> {
    throw new Error('not implemented');
  }

  lazy(): InjectionToken<T> {
    throw new Error('not implemented');
  }
}
