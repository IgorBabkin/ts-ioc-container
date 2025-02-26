import { IInjector, InjectOptions } from './IInjector';
import { IContainer } from '../container/IContainer';
import { constructor } from '../utils';

export class SimpleInjector implements IInjector {
  resolve<T>(container: IContainer, Target: constructor<T>, { args: deps }: InjectOptions): T {
    return new Target(container, ...deps);
  }
}
