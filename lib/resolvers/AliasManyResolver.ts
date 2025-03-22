import { DependencyKey, IContainer } from '../container/IContainer';
import { InjectionResolver, InjectOptions } from './InjectionResolver';

export class AliasManyResolver<T> extends InjectionResolver<T[]> {
  constructor(private alias: DependencyKey) {
    super();
  }

  protected override resolveByOptions(c: IContainer, options: InjectOptions): T[] {
    return c.resolveMany(this.alias, options);
  }
}
