import { IInjector, InjectOptions, Injector } from './IInjector';
import { type constructor } from '../utils/basic';

export class SimpleInjector extends Injector implements IInjector {
  protected createInstance<T>(Target: constructor<T>, { scope, args = [] }: InjectOptions): T {
    return new Target(scope, ...args);
  }
}
