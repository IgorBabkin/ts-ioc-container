import { IInjector, InjectOptions, Injector } from './IInjector';
import type { IContainer } from '../container/IContainer';
import { type constructor } from '../utils/basic';

export class SimpleInjector extends Injector implements IInjector {
  protected createInstance<T>(container: IContainer, Target: constructor<T>, { args = [] }: InjectOptions = {}): T {
    return new Target(container, ...args);
  }
}
