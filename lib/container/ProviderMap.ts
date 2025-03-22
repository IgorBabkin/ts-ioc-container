import { DependencyKey } from './IContainer';
import { IProvider } from '../provider/IProvider';
import { DependencyNotFoundError } from '../errors/DependencyNotFoundError';

export class ProviderMap {
  private readonly providers = new Map<DependencyKey, IProvider>();

  register(key: DependencyKey, provider: IProvider): void {
    this.providers.set(key, provider);
  }

  findOneByKey<T>(key: DependencyKey): IProvider<T> | undefined {
    return this.providers.get(key);
  }

  findOneByKeyOrFail<T>(key: DependencyKey): IProvider<T> {
    if (!this.providers.has(key)) {
      throw new DependencyNotFoundError(`Provider ${key.toString()} does not exist`);
    }
    return this.providers.get(key)!;
  }

  destroy(): void {
    this.providers.clear();
  }

  has(keyOrAlias: DependencyKey) {
    return this.providers.has(keyOrAlias);
  }
}
