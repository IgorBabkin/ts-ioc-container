import type { IContainer } from '../container/IContainer';

import { resolveArgs } from '../injector/inject';
import { InjectionToken } from '../token/InjectionToken';
import { type constructor } from '../utils/basic';
import { getProxyTarget, isProxy } from '../utils/proxy';

export interface IHookContext {
  instance: object;
  scope: IContainer;
  methodName?: string;

  resolveArgs(...args: unknown[]): unknown[];

  invokeMethod(options?: { args?: unknown[] }): unknown;

  setProperty(fn: InjectionToken): void;

  setInitialArgs(...args: unknown[]): this;
}

export class HookContext implements IHookContext {
  readonly instance: object;
  private initialArgs: unknown[] = [];

  constructor(
    instance: object,
    public scope: IContainer,
    public methodName?: string,
  ) {
    this.instance = isProxy(instance) ? getProxyTarget(instance) : instance;
  }

  resolveArgs(...args: unknown[]): unknown[] {
    return resolveArgs(this.instance.constructor as constructor<unknown>, this.methodName)(this.scope, {
      args: [...this.initialArgs, ...args],
    });
  }

  invokeMethod({ args = this.resolveArgs() }: { args?: unknown[] } = {}): unknown {
    // @ts-ignore
    return this.instance[this.methodName](...args);
  }

  setProperty(fn: InjectionToken): void {
    // @ts-ignore
    this.instance[this.methodName] = fn.resolve(this.scope);
  }

  setInitialArgs(...args: unknown[]): this {
    this.initialArgs = args;
    return this;
  }
}

export type CreateHookContext = (Target: object, scope: IContainer, methodName?: string) => IHookContext;
export const createHookContext: CreateHookContext = (Target, scope, methodName = 'constructor') =>
  new HookContext(Target, scope, methodName);

export const createHookContextFactory =
  ({ args = [] }: { args?: unknown[] } = {}): CreateHookContext =>
  (Target, scope, methodName) =>
    createHookContext(Target, scope, methodName).setInitialArgs(...args);
