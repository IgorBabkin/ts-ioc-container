import { InjectionResolver, InjectOptions } from './InjectionResolver';
import { DependencyKey, IContainer } from '../container/IContainer';
import { constructor } from '../utils';

export class OneResolver<T> extends InjectionResolver<T> {
  constructor(private key: constructor<T> | DependencyKey) {
    super();
  }

  protected override resolveByOptions(c: IContainer, options: InjectOptions): T {
    return c.resolve(this.key, options);
  }
}
