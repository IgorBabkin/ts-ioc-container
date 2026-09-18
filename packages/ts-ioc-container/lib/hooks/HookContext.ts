import type { IContainer } from '../container/IContainer';

import { type Instance } from '../utils/basic';
import { resolveArgs } from '../injector/MetadataInjector';
import { type InjectFn } from './hook';

export interface IHookContext {
  instance: Instance;
  scope: IContainer;
  methodName?: string;

  resolveArgs(...args: unknown[]): unknown[];

  invokeMethod(options?: { args?: unknown[] }): unknown;

  setProperty(fn: InjectFn): void;

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
    return resolveArgs(
      this.instance,
      this.methodName,
    )({
      scope: this.scope,
      args: [...this.initialArgs, ...args],
    });
  }

  invokeMethod({ args = this.resolveArgs() }: { args?: unknown[] } = {}): unknown {
    // @ts-ignore
    return this.instance[this.methodName](...args);
  }

  setProperty(fn: InjectFn): void {
    // @ts-ignore
    this.instance[this.methodName] = fn({ scope: this.scope });
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

export type CreateHookExecutionContext = (Target: Instance, scope: IContainer, methodName?: string) => IHookContext;
export const createHookExecutionContext: CreateHookExecutionContext = (Target, scope, methodName = 'constructor') =>
  new HookContext(Target, scope, methodName);

export const createHookContextFactory =
  ({ args = [] }: { args?: unknown[] } = {}): CreateHookExecutionContext =>
  (Target, scope, methodName) =>
    createHookExecutionContext(Target, scope, methodName).setInitialArgs(...args);
