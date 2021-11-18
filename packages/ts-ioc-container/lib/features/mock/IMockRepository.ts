import { IDisposable, InjectionToken } from '../../index';

export interface IMockRepository extends IDisposable {
    resolve<T>(key: InjectionToken<T>): T;
}
