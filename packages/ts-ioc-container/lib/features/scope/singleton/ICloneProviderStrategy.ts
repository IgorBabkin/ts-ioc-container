import { IProvider } from '../../../core/IProvider';

export interface ICloneProviderStrategy {
    clone<T>(provider: IProvider<T>): IProvider<T>;
}
