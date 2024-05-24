import { IInjector, InjectOptions } from './IInjector';
import { IContainer } from '../container/IContainer';
import { constructor } from '../utils';
import { resolveArgs } from './inject.ts';

export class MetadataInjector implements IInjector {
  resolve<T>(scope: IContainer, Target: constructor<T>, { args: deps }: InjectOptions): T {
    const args = resolveArgs(Target)(scope, ...deps);
    return new Target(...args);
  }
}
