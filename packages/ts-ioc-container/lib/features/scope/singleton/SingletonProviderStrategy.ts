import { IProvider } from '../../../core/IProvider';
import { ProviderNotClonedError } from '../../../errors/ProviderNotClonedError';
import { ICloneProviderStrategy } from './ICloneProviderStrategy';

export class SingletonProviderStrategy implements ICloneProviderStrategy {
    clone<T>(provider: IProvider<T>): IProvider<T> {
        throw new ProviderNotClonedError('SingletonProvider cannot be cloned');
    }
}
