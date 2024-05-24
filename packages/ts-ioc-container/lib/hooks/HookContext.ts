import { resolveArgs } from '../injector/inject';
import { IContainer } from '../container/IContainer';
import { constructor } from '../utils';

export type InjectFn<T = unknown> = (l: IContainer) => T;

export interface IHookContext {
  instance: object;
  scope: IContainer;
  methodName?: string;

  resolveArgs(...args: unknown[]): unknown[];

  invokeMethod({ args }: { args?: unknown[] }): unknown;

  injectProperty(fn: InjectFn): void;
}

export class HookContext implements IHookContext {
  constructor(
    public instance: object,
    public scope: IContainer,
    public methodName?: string,
  ) {}

  resolveArgs(...args: unknown[]): unknown[] {
    return resolveArgs(this.instance.constructor as constructor<unknown>, this.methodName)(this.scope, ...args);
  }

  invokeMethod({ args = this.resolveArgs() }: { args?: unknown[] }): unknown {
    // @ts-ignore
    return this.instance[this.methodName](...args);
  }

  injectProperty(fn: InjectFn): void {
    // @ts-ignore
    this.instance[this.methodName] = fn(this.scope);
  }
}

export const createHookContext = (Target: object, scope: IContainer, methodName = 'constructor'): IHookContext =>
  new HookContext(Target, scope, methodName);

export const hookMetaKey = (methodName = 'constructor') => `inject:${methodName}`;