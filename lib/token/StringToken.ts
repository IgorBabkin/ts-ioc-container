import type { IContainer } from '../container/IContainer';
import { InjectionToken } from './InjectionToken';
import { IRegistration } from '../registration/IRegistration';
import { ProviderOptions } from '../provider/IProvider';

export class StringToken<T = any> extends InjectionToken {
  constructor(
    public token: string | symbol,
    private options: ProviderOptions = {},
  ) {
    super();
  }

  resolve(s: IContainer): T {
    return s.resolve(this.token);
  }

  bindTo(r: IRegistration<T>) {
    r.bindToKey(this.token);
  }

  args(...args: unknown[]): StringToken<T> {
    return new StringToken(this.token, {
      ...this.options,
      args: [...(this.options.args as unknown[]), ...(args as unknown[])],
    });
  }

  lazy(): StringToken<T> {
    return new StringToken(this.token, { ...this.options, lazy: true });
  }
}
