import { IContainer } from '../container/IContainer';
import { IProvider, ProviderDecorator, ProviderResolveOptions } from './IProvider';
import { RegistrationPipe } from './ProviderPipe';

export type DecorateFn<Instance = any> = (dep: Instance, scope: IContainer) => Instance;

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

class DecoratePipe<Instance> extends RegistrationPipe<Instance> {
  constructor(private decorateFn: DecorateFn<Instance>) {
    super();
  }

  mapProvider(provider: IProvider<Instance>): IProvider<Instance> {
    return new DecoratorProvider(provider, this.decorateFn);
  }
}

export const decorate = (decorateFn: DecorateFn) => {
  return new DecoratePipe(decorateFn);
};
