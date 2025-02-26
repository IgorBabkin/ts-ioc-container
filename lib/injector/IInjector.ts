import { constructor } from '../utils';
import { IContainer } from '../container/IContainer';

export type InjectOptions = { args: unknown[] };

export interface IInjector {
  resolve<T>(container: IContainer, value: constructor<T>, options: InjectOptions): T;
}
