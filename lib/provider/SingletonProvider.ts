import type { IContainer } from '../container/IContainer';
import type { IProvider } from './IProvider';
import { ProviderDecorator } from './IProvider';
import { registerPipe } from './ProviderPipe';
import { InjectOptions } from '../injector/IInjector';

type GetCacheKey = (...args: unknown[]) => string | symbol;

export class SingletonProvider<T> extends ProviderDecorator<T> {
  private cache = new Map<string | symbol, unknown>();

  constructor(
    private provider: IProvider<T>,
    private getKey: GetCacheKey,
  ) {
    super(provider);
  }

  resolve(container: IContainer, options: InjectOptions): T {
    const { args = [] } = options;
    const key = this.getKey(...args);

    if (!this.cache.has(key)) {
      this.cache.set(key, this.provider.resolve(container, options));
    }

    return this.cache.get(key)! as T;
  }
}

export const singleton = <T = unknown>(getCacheKey: GetCacheKey = () => '1') =>
  registerPipe<T>((p) => new SingletonProvider(p, getCacheKey));
