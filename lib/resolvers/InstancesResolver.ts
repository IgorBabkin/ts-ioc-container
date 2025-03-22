import { IInjectFnResolver } from '../injector/IInjector';
import { IContainer, Instance } from '../container/IContainer';
import { InstancePredicate } from './InjectionResolver';

export class InstancesResolver implements IInjectFnResolver<Instance[]> {
  #cascade = true;

  constructor(private predicate: InstancePredicate) {}

  cascade(isTrue: boolean): this {
    this.#cascade = isTrue;
    return this;
  }

  resolve(c: IContainer): Instance[] {
    return c.getInstances({ cascade: this.#cascade }).filter(this.predicate);
  }
}
