import {Write} from "./writeMonad";

export type constructor<T> = new (...args: any[]) => T;
export type Fn<A, B> = (value: Write<A>) => Write<B>;
export type InjectFn<Context, T = unknown> = (l: Context) => T;
export type InjectionDecorator<Context> = (fn: Fn<Context, unknown>) => ParameterDecorator;
