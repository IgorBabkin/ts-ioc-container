import type { IContainer } from '../container/IContainer';
import { InjectionToken } from './InjectionToken';
import { constructor } from '../utils';
import { ProviderOptions } from '../provider/IProvider';

export class ClassToken<T = any> extends InjectionToken<T> {
  constructor(
    private readonly token: constructor<T>,
    private options: ProviderOptions = {},
  ) {
    super();
  }

  resolve(s: IContainer) {
    return s.resolve(this.token);
  }

  args(...deps: unknown[]): InjectionToken<T> {
    return new ClassToken(this.token, { ...this.options, args: [...(this.options?.args ?? []), ...deps] });
  }

  lazy() {
    return new ClassToken(this.token, { ...this.options, lazy: true });
  }
}
