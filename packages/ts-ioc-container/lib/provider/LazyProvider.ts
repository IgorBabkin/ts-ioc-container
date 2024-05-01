import { IProvider, ProviderDecorator, ProviderResolveOptions } from './IProvider';
import { IContainer } from '../container/IContainer';
import { lazyInstance } from '../utils';

export class LazyProvider<Instance> extends ProviderDecorator<Instance> {
  constructor(private provider: IProvider<Instance>) {
    super(provider);
  }

  resolve(container: IContainer, options: ProviderResolveOptions): Instance {
    return lazyInstance(() => this.provider.resolve(container, options));
  }
}

export const makeProviderLazy = <Instance>(provider: IProvider<Instance>) => new LazyProvider(provider);
