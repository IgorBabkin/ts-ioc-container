import { Fn } from './pipe';

export type constructor<T> = new (...args: any[]) => T;
export type InjectFn<Context, T = unknown> = (l: Context, ...args: any) => T;
export type MapFn<A, B> = (input: A) => B;
export type InjectionDecorator<Context> = (fn: Fn<Context, unknown>) => ParameterDecorator;
export type InjectionPropertyDecorator<Context, Instance = any> = (
    fn: (value: Context, instance: Instance) => unknown,
) => PropertyDecorator;
