import { InjectOptions, Injector } from './IInjector';
import type { IContainer } from '../container/IContainer';
import { constructor } from '../utils';

export class SimpleInjector extends Injector {
  protected createInstance<T>(container: IContainer, Target: constructor<T>, { args = [] }: InjectOptions = {}): T {
    return new Target(container, ...args);
  }
}
