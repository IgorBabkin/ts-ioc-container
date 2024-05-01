import { IContainer } from '../container/IContainer';
import { IProvider, ProviderDecorator } from './IProvider';

export type DecorateFn<Instance> = (dep: Instance, scope: IContainer) => Instance;

export class DecoratorProvider<Instance> extends ProviderDecorator<Instance> {
  constructor(
    private provider: IProvider<Instance>,
    private decorateFn: DecorateFn<Instance>,
  ) {
    super(provider);
  }

  resolve(scope: IContainer, ...args: unknown[]): Instance {
    const dependency = this.provider.resolve(scope, ...args);
    return this.decorateFn(dependency, scope);
  }
}

export const decorate =
  <Instance>(decorateFn: DecorateFn<Instance>) =>
  (provider: IProvider<Instance>) =>
    new DecoratorProvider(provider, decorateFn);
