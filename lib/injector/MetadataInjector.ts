import { IInjector, InjectOptions, Injector } from './IInjector';
import type { IContainer } from '../container/IContainer';
import { resolveArgs } from './inject';
import { constructor } from '../types';

export class MetadataInjector extends Injector implements IInjector {
  protected createInstance<T>(scope: IContainer, Target: constructor<T>, { args: deps = [] }: InjectOptions = {}): T {
    const args = resolveArgs(Target)(scope, ...deps);
    return new Target(...args);
  }
}
