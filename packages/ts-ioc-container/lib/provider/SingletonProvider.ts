import { IContainer } from '../container/IContainer';
import { ProviderDecorator } from './ProviderDecorator';
import { IProvider } from './IProvider';
import { MapFn } from '../utils';

export interface Cache<K, V> {
  getKey(...args: unknown[]): K;

  hasValue(key: K): boolean;

  getValue(key: K): V;

  setValue(key: K, value: V): void;
}

export class CacheMap<K, V> implements Cache<K, V> {
  private instances = new Map<K, V>();

  constructor(readonly getKey: (...args: unknown[]) => K = () => '1' as K) {}

  hasValue(token: K): boolean {
    return this.instances.has(token);
  }

  getValue(token: K): V {
    return this.instances.get(token) as V;
  }

  setValue(token: K, value: V): void {
    this.instances.set(token, value);
  }
}

export function singleton<T = unknown>(cacheProvider?: () => Cache<unknown, T>): MapFn<IProvider<T>> {
  return (provider) => new SingletonProvider(provider, cacheProvider ? cacheProvider() : undefined);
}

export class SingletonProvider<T> extends ProviderDecorator<T> {
  constructor(
    private readonly provider: IProvider<T>,
    private readonly cache: Cache<unknown, T> = new CacheMap<string, T>(() => '1'),
  ) {
    super(provider);
  }

  resolve(container: IContainer, ...args: unknown[]): T {
    const key = this.cache.getKey(...args);

    if (!this.cache.hasValue(key)) {
      this.cache.setValue(key, this.provider.resolve(container, ...args));
    }

    return this.cache.getValue(key);
  }
}
