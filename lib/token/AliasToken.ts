import type { DependencyKey, IContainer } from '../container/IContainer';
import { InjectionToken } from './InjectionToken';
import { IRegistration } from '../registration/IRegistration';
import { BindToken } from '../registration/BindToken';

export class AliasToken<T = any> extends InjectionToken<T[]> implements BindToken<T> {
  constructor(readonly token: string | symbol) {
    super();
  }

  resolve(s: IContainer): T[] {
    return s.resolveByAlias(this.token);
  }

  bindTo(r: IRegistration<T>) {
    r.bindToAlias(this.token);
  }

  args(...deps: unknown[]): InjectionToken<T[]> {
    return this;
  }

  lazy(): InjectionToken<T[]> {
    return this;
  }
}

export const toAlias = (token: DependencyKey) => new AliasToken(token);
