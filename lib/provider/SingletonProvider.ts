import { IContainer } from '../container/IContainer';
import { IProvider, ProviderDecorator, ProviderResolveOptions } from './IProvider';
import { MapFn } from '../utils';
import { Cache, SingleCache } from './Cache';

export function singleton<T = unknown>(cacheProvider?: () => Cache<unknown, T>): MapFn<IProvider<T>> {
  return (provider) => new SingletonProvider(provider, cacheProvider ? cacheProvider() : new SingleCache());
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
