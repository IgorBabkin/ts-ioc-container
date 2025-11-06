import { InjectionToken } from './InjectionToken';
import type { IContainer } from '../container/IContainer';
import { MethodNotImplementedError } from '../errors/MethodNotImplementedError';

import { Instance } from '../types';

export type InstancePredicate = (dep: unknown) => boolean;

export class InstanceListToken extends InjectionToken<Instance[]> {
  private isCascade = true;

  constructor(private predicate: InstancePredicate) {
    super();
  }

  args(...deps: unknown[]): this {
    throw new MethodNotImplementedError('not implemented');
  }

  argsFn(getArgsFn: (s: IContainer) => unknown[]): InjectionToken<Instance[]> {
    throw new MethodNotImplementedError('not implemented');
  }

  lazy(): InjectionToken<Instance[]> {
    throw new MethodNotImplementedError('not implemented');
  }

  cascade(isTrue: boolean): this {
    this.isCascade = isTrue;
    return this;
  }

  resolve(c: IContainer): Instance[] {
    return c.getInstances(this.isCascade).filter(this.predicate);
  }
}
