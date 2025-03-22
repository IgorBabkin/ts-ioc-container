import { DependencyKey, IContainer } from '../container/IContainer';
import { InjectionResolver, InjectOptions } from './InjectionResolver';

export class KeyResolver<T> extends InjectionResolver<T> {
  constructor(private key: DependencyKey) {
    super();
  }

  protected override resolveByOptions(c: IContainer, options: InjectOptions): T {
    return c.resolveOneByKey(this.key, options);
  }
}
