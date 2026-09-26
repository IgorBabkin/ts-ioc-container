import { IInjector, InjectOptions, Injector } from './IInjector';
import { type constructor } from '../utils/basic';

/**
 * Injector that passes the scope itself as the first constructor argument,
 * followed by the runtime args. Needs no decorators or `reflect-metadata`.
 *
 * @example
 * class App {
 *   constructor(scope: IContainer) {
 *     this.logger = scope.resolve('Logger');
 *   }
 * }
 * new Container({ injector: new SimpleInjector() });
 */
export class SimpleInjector extends Injector implements IInjector {
  protected createInstance<T>(Target: constructor<T>, { scope, args = [] }: InjectOptions): T {
    return new Target(scope, ...args);
  }
}
