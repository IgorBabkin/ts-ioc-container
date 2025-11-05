import { InjectionToken } from './InjectionToken';
import type { IContainer, Instance } from '../container/IContainer';

export type InstancePredicate = (dep: unknown) => boolean;

export class InstanceListToken extends InjectionToken<Instance[]> {
  private isCascade = true;

  constructor(private predicate: InstancePredicate) {
    super();
  }

  args(...deps: unknown[]): this {
    throw new Error('not implemented');
  }

  lazy(): InjectionToken<Instance[]> {
    throw new Error('not implemented');
  }

  cascade(isTrue: boolean): this {
    this.isCascade = isTrue;
    return this;
  }

  resolve(c: IContainer): Instance[] {
    const result = new Set<Instance>(c.getInstances().filter(this.predicate));
    if (this.isCascade) {
      for (const s of c.getScopes()) {
        for (const instance of s.getInstances().filter(this.predicate)) {
          result.add(instance);
        }
      }
    }
    return [...result];
  }
}
