import { IServiceLocator } from '../../../core/IServiceLocator';

export type InjectFn<T> = (l: IServiceLocator) => T;
