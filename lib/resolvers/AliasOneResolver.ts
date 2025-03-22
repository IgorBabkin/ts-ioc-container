import { InjectionResolver, InjectOptions } from './InjectionResolver';
import { DependencyKey, IContainer } from '../container/IContainer';

export class AliasOneResolver<T> extends InjectionResolver<T[]> {
  constructor(private alias: DependencyKey) {
    super();
  }

  protected override resolveByOptions(c: IContainer, options: InjectOptions): T[] {
    return c.resolveOneByAlias(this.alias, options);
  }
}
