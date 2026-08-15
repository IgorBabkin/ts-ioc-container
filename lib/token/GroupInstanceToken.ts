import { InjectionToken } from './InjectionToken';
import type { IContainer } from '../container/IContainer';
import { MethodNotImplementedError } from '../errors/MethodNotImplementedError';

import { Instance } from '../utils/basic';

export type InstancePredicate = (dep: unknown) => boolean;

export class GroupInstanceToken extends InjectionToken<Instance[]> {
  private isCascade = true;

  constructor(private predicate: InstancePredicate) {
    super();
  }

  select<R>(fn: (target: Instance) => R) {
    return (s: IContainer) => this.resolve(s).map(fn);
  }

  /**
   * @throws {MethodNotImplementedError} always — a group instance token cannot receive static args.
   */
  args(...deps: unknown[]): this {
    throw new MethodNotImplementedError('not implemented');
  }

  /**
   * @throws {MethodNotImplementedError} always — a group instance token cannot receive resolved args.
   */
  argsFn(getArgsFn: (s: IContainer) => unknown[]): InjectionToken<Instance[]> {
    throw new MethodNotImplementedError('not implemented');
  }

  /**
   * @throws {MethodNotImplementedError} always — a group instance token cannot be made lazy.
   */
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
