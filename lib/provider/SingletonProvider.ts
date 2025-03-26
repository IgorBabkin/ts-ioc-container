import type { IContainer } from '../container/IContainer';
import type { IProvider, ProviderResolveOptions } from './IProvider';
import { ProviderDecorator } from './IProvider';
import { SingleCache } from './Cache';
import type { Cache } from './Cache';
import { RegistrationPipe } from './ProviderPipe';

class SingletonPipe<T> extends RegistrationPipe<T> {
  constructor(private readonly cacheProvider?: () => Cache<unknown, T>) {
    super();
  }

  mapProvider(provider: IProvider<T>): IProvider<T> {
    return new SingletonProvider(provider, this.cacheProvider ? this.cacheProvider() : new SingleCache());
  }
}

export class SingletonProvider<T> extends ProviderDecorator<T> {
  constructor(
    private readonly provider: IProvider<T>,
    private readonly cache: Cache<unknown, T>,
  ) {
    super(provider);
  }

  resolve(container: IContainer, options: ProviderResolveOptions): T {
    const key = this.cache.getKey(...options.args);

    if (!this.cache.hasValue(key)) {
      this.cache.setValue(key, this.provider.resolve(container, options));
    }

    return this.cache.getValue(key);
  }
}

export const singleton = <T = unknown>(cacheProvider?: () => Cache<unknown, T>) => new SingletonPipe(cacheProvider);
