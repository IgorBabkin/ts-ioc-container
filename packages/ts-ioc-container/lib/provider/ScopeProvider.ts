import { IProvider } from './IProvider';
import { ProviderDecorator } from './ProviderDecorator';
import { IContainer } from '../container/IContainer';
import { MapFn } from '../utils';

type ContainerPredicate = (c: IContainer) => boolean;

export function scope<T = unknown>(predicate: ContainerPredicate): MapFn<IProvider<T>> {
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

  isValid(container: IContainer): boolean {
    return this.predicate(container) && this.provider.isValid(container);
  }
}
