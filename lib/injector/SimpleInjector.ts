import type { IInjector, InjectOptions } from './IInjector';
import type { IContainer } from '../container/IContainer';
import type { constructor } from '../utils';

export class SimpleInjector implements IInjector {
  resolve<T>(container: IContainer, Target: constructor<T>, { args: deps }: InjectOptions): T {
    return new Target(container, ...deps);
  }
}
