import { IServiceLocator } from '../../lib';

export type InjectFn<T> = (l: IServiceLocator) => T;
