import { Resolvable } from '../container/IContainer';
import { ProviderDecorator } from './ProviderDecorator';
import { IProvider } from './IProvider';
import { MapFn } from '../utils';

type Cache<T> = { value: T };

export function asSingleton<T = unknown>(): MapFn<IProvider<T>> {
  return (provider) => new SingletonProvider(provider);
}

export class SingletonProvider<T> extends ProviderDecorator<T> {
  private instance?: Cache<T>;

  constructor(private readonly provider: IProvider<T>) {
    super(provider);
  }

  clone(): SingletonProvider<T> {
    return new SingletonProvider(this.provider.clone());
  }

  resolve(container: Resolvable, ...args: unknown[]): T {
    this.instance = this.instance ?? { value: this.provider.resolve(container, ...args) };
    return this.instance.value;
  }
}
