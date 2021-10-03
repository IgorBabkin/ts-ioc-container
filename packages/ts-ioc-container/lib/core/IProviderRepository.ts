import { IProvider, ProviderKey } from './IProvider';
import { IDisposable } from '../helpers/IDisposable';

export interface IProviderRepository extends IDisposable {
    level: number;

    name?: string;

    clone(parent?: IProviderRepository, name?: string): IProviderRepository;

    find<T>(key: ProviderKey): IProvider<T>;

    add<T>(key: ProviderKey, provider: IProvider<T>): void;
}
