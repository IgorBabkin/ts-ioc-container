import { IProvider } from '../../../core/IProvider';
import { SingletonProvider } from './SingletonProvider';
import { ICloneProviderStrategy } from './ICloneProviderStrategy';

export class SingletonForEveryScopeProviderStrategy implements ICloneProviderStrategy {
    clone<T>(provider: IProvider<T>): IProvider<T> {
        return new SingletonProvider(provider.clone(), new SingletonForEveryScopeProviderStrategy());
    }
}
