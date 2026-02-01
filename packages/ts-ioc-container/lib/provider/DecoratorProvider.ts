import type { IContainer } from '../container/IContainer';
import type { IProvider } from './IProvider';
import { ProviderDecorator } from './IProvider';
import { registerPipe } from './ProviderPipe';
import { InjectOptions } from '../injector/IInjector';

export type DecorateFn<Instance = any> = (dep: Instance, scope: IContainer) => Instance;

export class DecoratorProvider<Instance> extends ProviderDecorator<Instance> {
  constructor(
    private provider: IProvider<Instance>,
    private decorateFn: DecorateFn<Instance>,
  ) {
    super(provider);
  }

  resolve(scope: IContainer, options: InjectOptions): Instance {
    const dependency = this.provider.resolve(scope, options);
    return this.decorateFn(dependency, scope);
  }
}

export const decorate = (decorateFn: DecorateFn) => registerPipe((p) => new DecoratorProvider(p, decorateFn));
