import { IMockAdapter, ProviderKey } from '../index';

export interface IMockRepository<GMock> {
    findOrCreate<GInstance>(key: ProviderKey): IMockAdapter<GMock, GInstance>;
}
