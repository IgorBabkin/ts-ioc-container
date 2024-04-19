import { ProviderDecorator } from './ProviderDecorator';
import { IContainer } from '../container/IContainer';
import { IProvider, markAsProvider } from './IProvider';
import { MapFn } from '../utils';

export type ArgsFn = (l: IContainer) => unknown[];

export function args<T = unknown>(...extraArgs: unknown[]): MapFn<IProvider<T>> {
  return markAsProvider((provider) => new ArgsProvider(provider, () => extraArgs));
}

export function argsFn<T = unknown>(value: ArgsFn): MapFn<IProvider<T>> {
  return markAsProvider((provider) => new ArgsProvider(provider, value));
}

export class ArgsProvider<T> extends ProviderDecorator<T> {
  constructor(
    private provider: IProvider<T>,
    private argsFn: ArgsFn,
  ) {
    super(provider);
  }

  resolve(container: IContainer, ...args: unknown[]): T {
    return this.provider.resolve(container, ...this.argsFn(container), ...args);
  }
}
