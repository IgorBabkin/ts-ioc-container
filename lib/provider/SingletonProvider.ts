import type { IContainer } from '../container/IContainer';
import type { IProvider } from './IProvider';
import { ProviderDecorator } from './IProvider';
import type { Cache } from './Cache';
import { SingleCache } from './Cache';
import { registerPipe } from './ProviderPipe';
import { InjectOptions } from '../injector/IInjector';

export class SingletonProvider<T> extends ProviderDecorator<T> {
  constructor(
    private readonly provider: IProvider<T>,
    private readonly cache: Cache<unknown, T>,
  ) {
    super(provider);
  }

  resolve(container: IContainer, options: InjectOptions): T {
    const { args = [] } = options;
    const key = this.cache.getKey(...args);

    if (!this.cache.hasValue(key)) {
      this.cache.setValue(key, this.provider.resolve(container, options));
    }

    return this.cache.getValue(key);
  }
}

export const singleton = <T = unknown>(cacheProvider?: () => Cache<unknown, T>) =>
  registerPipe<T>((p) => new SingletonProvider(p, cacheProvider ? cacheProvider() : new SingleCache()));
