import type { IContainer } from '../container/IContainer';

import { InjectionToken } from '../token/InjectionToken';
import { type Instance } from '../utils/basic';
import { resolveArgs } from '../injector/MetadataInjector';

export interface IHookContext {
  instance: Instance;
  scope: IContainer;
  methodName?: string;

  resolveArgs(...args: unknown[]): unknown[];

  invokeMethod(options?: { args?: unknown[] }): unknown;

  setProperty(fn: InjectionToken): void;

  getProperty(): unknown;

  setInitialArgs(...args: unknown[]): this;

  getInitialArgs(): unknown[];
}

export class HookContext implements IHookContext {
  private initialArgs: unknown[] = [];

  constructor(
    readonly instance: Instance,
    readonly scope: IContainer,
    readonly methodName?: string,
  ) {}

  resolveArgs(...args: unknown[]): unknown[] {
    return resolveArgs(this.instance, this.methodName)(this.scope, {
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

  getProperty(): unknown {
    // @ts-ignore
    return this.instance[this.methodName];
  }

  setInitialArgs(...args: unknown[]): this {
    this.initialArgs = args;
    return this;
  }

  getInitialArgs(): unknown[] {
    return this.initialArgs;
  }
}

export type CreateHookContext = (Target: Instance, scope: IContainer, methodName?: string) => IHookContext;
export const createHookContext: CreateHookContext = (Target, scope, methodName = 'constructor') =>
  new HookContext(Target, scope, methodName);

export const createHookContextFactory =
  ({ args = [] }: { args?: unknown[] } = {}): CreateHookContext =>
  (Target, scope, methodName) =>
    createHookContext(Target, scope, methodName).setInitialArgs(...args);
