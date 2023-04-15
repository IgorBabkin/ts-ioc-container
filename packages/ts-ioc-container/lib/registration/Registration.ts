import { IProvider, ProviderKey } from '../provider/IProvider';

export interface Registration<T = unknown> {
    key: ProviderKey;
    provider: IProvider<T>;
}
