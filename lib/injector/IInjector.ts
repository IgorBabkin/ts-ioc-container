import { type constructor } from '../utils';
import { type IContainer } from '../container/IContainer';

export type InjectOptions = { args: unknown[] };

export interface IInjector {
  resolve<T>(container: IContainer, value: constructor<T>, options: InjectOptions): T;
}

export interface IInjectFnResolver<T> {
  resolve(s: IContainer): T;
}
