import { InjectFn, resolveArgs } from '../injector/MetadataInjector';
import { IContainer } from '../container/IContainer';
import { constructor } from 'utils';

export class ExecutionContext {
  constructor(
    public instance: object,
    public methodName: string,
    public scope: IContainer,
  ) {}

  resolveArgs(...args: unknown[]): unknown[] {
    return resolveArgs(this.instance.constructor as constructor<unknown>, this.methodName)(this.scope, ...args);
  }

  invokeMethod({ args = this.resolveArgs() }: { args: unknown[] }): unknown {
    // @ts-ignore
    return this.instance[this.methodName](...args);
  }

  injectProperty(fn: InjectFn): void {
    // @ts-ignore
    this.instance[this.methodName] = fn(this.scope);
  }
}
