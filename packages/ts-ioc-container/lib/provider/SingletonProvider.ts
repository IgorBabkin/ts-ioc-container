import { IContainer } from '../container/IContainer';
import { ProviderDecorator } from './ProviderDecorator';
import { IProvider, markAsProvider } from './IProvider';
import { MapFn } from '../utils';

type Cache<T> = { value: T };

export function singleton<T = unknown>(): MapFn<IProvider<T>> {
  return markAsProvider((provider) => new SingletonProvider(provider));
}

export class SingletonProvider<T> extends ProviderDecorator<T> {
  private instance?: Cache<T>;

  constructor(private readonly provider: IProvider<T>) {
    super(provider);
  }

  resolve(container: IContainer, ...args: unknown[]): T {
    this.instance = this.instance ?? { value: this.provider.resolve(container, ...args) };
    return this.instance.value;
  }
}
