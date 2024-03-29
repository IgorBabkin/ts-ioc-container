import { Fn } from './pipe';

export type constructor<T> = new (...args: any[]) => T;
export type InjectFn<Context, T = unknown> = (l: Context, ...args: unknown[]) => T;
export type InjectionDecorator<Context> = (fn: Fn<Context, unknown>) => ParameterDecorator;
