import { InjectOptions, Injector } from './IInjector';
import type { IContainer } from '../container/IContainer';
import type { constructor } from '../utils';
import { resolveArgs } from './inject';

export class MetadataInjector extends Injector {
  protected createInstance<T>(scope: IContainer, Target: constructor<T>, { args: deps = [] }: InjectOptions = {}): T {
    const args = resolveArgs(Target)(scope, ...deps);
    return new Target(...args);
  }
}
