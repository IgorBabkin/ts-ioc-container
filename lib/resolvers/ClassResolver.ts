import { InjectionResolver, InjectOptions } from './InjectionResolver';
import { IContainer } from '../container/IContainer';
import { constructor } from '../utils';

export class ClassResolver<T> extends InjectionResolver<T> {
  constructor(private Target: constructor<T>) {
    super();
  }

  protected override resolveByOptions(c: IContainer, options: InjectOptions): T {
    return c.resolveByClass(this.Target, options);
  }
}
