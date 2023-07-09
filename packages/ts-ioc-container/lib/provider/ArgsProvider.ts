import { ProviderDecorator } from './ProviderDecorator';
import { Resolvable } from '../container/IContainer';
import { IProvider } from './IProvider';
import { MapFn } from '../utils';

export type ArgsFn = (l: Resolvable) => unknown[];

export function withArgs<T = unknown>(...extraArgs: unknown[]): MapFn<IProvider<T>> {
  return (provider) => new ArgsProvider(provider, () => extraArgs);
}

export function withArgsFn<T = unknown>(value: ArgsFn): MapFn<IProvider<T>> {
  return (provider) => new ArgsProvider(provider, value);
}

export class ArgsProvider<T> extends ProviderDecorator<T> {
  constructor(private provider: IProvider<T>, private argsFn: ArgsFn) {
    super(provider);
  }

  resolve(container: Resolvable, ...args: unknown[]): T {
    return this.provider.resolve(container, ...this.argsFn(container), ...args);
  }

  clone(): ArgsProvider<T> {
    return new ArgsProvider(this.provider.clone(), this.argsFn);
  }
}
