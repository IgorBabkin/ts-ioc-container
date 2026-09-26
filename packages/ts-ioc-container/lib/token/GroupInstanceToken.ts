import { InjectionToken } from './InjectionToken';
import type { IContainer } from '../container/IContainer';
import { MethodNotImplementedError } from '../errors/MethodNotImplementedError';

import { Instance, Serializable } from '../utils/basic';

/** Selects instances for a {@link GroupInstanceToken}. */
export type InstancePredicate = (dep: unknown) => boolean;

/**
 * Resolves the instances already created in a scope (and, by default, its
 * child scopes) that match a predicate. Created by `select.instances(...)`.
 */
export class GroupInstanceToken extends InjectionToken<Instance[]> implements Serializable {
  private isCascade: boolean;

  constructor(
    private predicate: InstancePredicate,
    { tags = [], isCascade = true }: { tags?: string[]; isCascade?: boolean } = {},
  ) {
    super(tags);
    this.isCascade = isCascade;
  }

  select<R>(fn: (target: Instance) => R) {
    return (s: IContainer) => this.resolve(s).map(fn);
  }

  /**
   * @throws {MethodNotImplementedError} always — a group instance token cannot receive static args.
   */
  args(...deps: unknown[]): this {
    throw new MethodNotImplementedError('GroupInstanceToken.args is not implemented');
  }

  /**
   * @throws {MethodNotImplementedError} always — a group instance token cannot receive resolved args.
   */
  argsFn(getArgsFn: (s: IContainer) => unknown[]): InjectionToken<Instance[]> {
    throw new MethodNotImplementedError('GroupInstanceToken.argsFn is not implemented');
  }

  /**
   * @throws {MethodNotImplementedError} always — a group instance token cannot be made lazy.
   */
  lazy(): InjectionToken<Instance[]> {
    throw new MethodNotImplementedError('GroupInstanceToken.lazy is not implemented');
  }

  /** Whether instances of child scopes are included (default `true`). */
  cascade(isTrue: boolean): this {
    this.isCascade = isTrue;
    return this;
  }

  resolve(c: IContainer): Instance[] {
    return c.getInstances(this.isCascade).filter(this.predicate);
  }

  addTags(...tags: string[]): GroupInstanceToken {
    return new GroupInstanceToken(this.predicate, { tags: [...this.getTags(), ...tags], isCascade: this.isCascade });
  }

  /**
   * @throws {MethodNotImplementedError} always — a group instance token has no underlying key.
   */
  toString(): string {
    throw new MethodNotImplementedError('GroupInstanceToken.toString is not implemented');
  }
}
