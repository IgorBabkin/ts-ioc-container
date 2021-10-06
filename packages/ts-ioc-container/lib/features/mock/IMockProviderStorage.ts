import { IProvider, ProviderKey } from '../../core/providers/IProvider';
import { IDisposable } from '../../helpers/IDisposable';

export interface IMockProviderStorage extends IDisposable {
    findOrCreate<T>(key: ProviderKey): IProvider<T>;
}
