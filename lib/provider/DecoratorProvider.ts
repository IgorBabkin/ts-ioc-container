import { IContainer } from '../container/IContainer';
import { IProvider, ProviderDecorator, ProviderMapper, ProviderResolveOptions } from './IProvider';

export type DecorateFn<Instance> = (dep: Instance, scope: IContainer) => Instance;

export class DecoratorProvider<Instance> extends ProviderDecorator<Instance> {
  constructor(
    private provider: IProvider<Instance>,
    private decorateFn: DecorateFn<Instance>,
  ) {
    super(provider);
  }

  resolve(scope: IContainer, options: ProviderResolveOptions): Instance {
    const dependency = this.provider.resolve(scope, options);
    return this.decorateFn(dependency, scope);
  }
}

export const decorate = <Instance>(decorateFn: DecorateFn<Instance>) =>
  new ProviderMapper([(provider: IProvider<Instance>) => new DecoratorProvider(provider, decorateFn)]);
