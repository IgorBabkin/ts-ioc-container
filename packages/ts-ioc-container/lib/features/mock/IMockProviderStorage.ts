import { IDisposable } from '../../helpers/types';
import { ProviderKey } from '../../core/IProviderRepository';
import { IProvider } from '../../core/provider/IProvider';

export interface IMockProviderStorage extends IDisposable {
    findOrCreate<T>(key: ProviderKey): IProvider<T>;
}
