import { IProvider, ProviderDecorator } from './IProvider';
import { IContainer } from '../container/IContainer';

export class LazyProvider<Instance> extends ProviderDecorator<Instance> {
  constructor(private provider: IProvider<Instance>) {
    super(provider);
  }

  resolve(container: IContainer, ...args: unknown[]): Instance {
    let instance: Instance | undefined;
    return new Proxy(
      {},
      {
        get: (_, prop) => {
          instance = instance ?? this.provider.resolve(container, ...args);
          // @ts-ignore
          return instance[prop];
        },
      },
    ) as Instance;
  }
}

export const lazy = <Instance>(provider: IProvider<Instance>) => new LazyProvider(provider);
