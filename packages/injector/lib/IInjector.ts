import { constructor } from './types';

export type InjectFn<Context, T = unknown> = (l: Context) => T;

export interface IInjector<Context> {
    resolve<T>(context: Context, value: constructor<T>, ...deps: unknown[]): T;
}
