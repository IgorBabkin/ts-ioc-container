import { IContainer } from '../container/IContainer';
import { IProvider, ProviderDecorator, ProviderResolveOptions } from './IProvider';
import { Cache, SingleCache } from './Cache';
import { RegistrationMapper } from './ProviderMapper';

class SingletonMapper<T> extends RegistrationMapper<T> {
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

export const singleton = <T = unknown>(cacheProvider?: () => Cache<unknown, T>) => new SingletonMapper(cacheProvider);
