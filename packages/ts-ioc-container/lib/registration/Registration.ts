import { IProvider, ProviderKey } from '../provider/IProvider';

export interface Registration<T> {
    key: ProviderKey;
    provider: IProvider<T>;
}
