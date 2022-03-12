import { Fn } from './pipe';

export type constructor<T> = new (...args: any[]) => T;
export type InjectFn<Context, T = unknown> = (l: Context) => T;
export type InjectionDecorator<Context> = (fn: Fn<Context, unknown>) => ParameterDecorator;
export type InjectionPropertyDecorator<Context> = (fn: Fn<Context, unknown>) => PropertyDecorator;
