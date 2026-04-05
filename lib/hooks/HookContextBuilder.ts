import type { IContainer } from '../container/IContainer';
import { HookContext, IHookContext } from './HookContext';

export type HookContextBuilderOptions = { target: object; scope: IContainer; methodName: string };

export interface IHookContextBuilder {
  mergeOptions(context: Partial<HookContextBuilderOptions>): void;
  build(context: Partial<HookContextBuilderOptions>): IHookContext;
  appendArgs(...args: unknown[]): this;
}

export class DefaultHookContextBuilder implements IHookContextBuilder {
  private options: Partial<HookContextBuilderOptions> = {};
  private initialArgs: unknown[] = [];

  build(context: Partial<HookContextBuilderOptions>): IHookContext {
    const target = context.target ?? this.options.target;
    const scope = context.scope ?? this.options.scope;
    const methodName = context.methodName ?? context.methodName;
    return new HookContext(target!, scope!, methodName).setInitialArgs(...this.initialArgs);
  }

  mergeOptions(context: Partial<HookContextBuilderOptions>): void {
    this.options = {
      ...this.options,
      ...context,
    };
  }

  appendArgs(...args: unknown[]): this {
    this.initialArgs.push(...args);
    return this;
  }
}
