import { IProvider } from './IProvider';
import { ProviderDecorator } from './ProviderDecorator';
import { IContainer, Tagged } from '../container/IContainer';
import { MapFn } from '../utils';

type ContainerPredicate = (c: IContainer) => boolean;

export function scope<T = unknown>(predicate: (c: Tagged) => boolean): MapFn<IProvider<T>> {
  return (provider) => new ScopeProvider(provider, predicate);
}

export class ScopeProvider<T> extends ProviderDecorator<T> {
  constructor(
    private provider: IProvider<T>,
    private predicate: ContainerPredicate,
  ) {
    super(provider);
  }

  clone(): ScopeProvider<T> {
    return new ScopeProvider(this.provider.clone(), this.predicate);
  }

  isValidToClone(container: IContainer): boolean {
    return this.predicate(container) && this.provider.isValidToClone(container);
  }

  isVisible(container: IContainer, child: Tagged): boolean {
    return this.predicate(container) && this.provider.isVisible(container, child);
  }
}
