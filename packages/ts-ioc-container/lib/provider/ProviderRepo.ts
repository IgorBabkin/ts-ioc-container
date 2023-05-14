import { IProvider } from './IProvider';
import { DependencyKey } from '../container/IContainer';

export class ProviderRepo {
    private readonly providers = new Map<DependencyKey, IProvider>();

    add(key: DependencyKey, provider: IProvider): this {
        this.providers.set(key, provider);
        return this;
    }

    find<T>(key: DependencyKey): IProvider<T> | undefined {
        return this.providers.get(key) as IProvider<T>;
    }

    merge(providers: Map<DependencyKey, IProvider>): Map<DependencyKey, IProvider> {
        const map = new Map<DependencyKey, IProvider>();
        for (const [key, value] of providers.entries()) {
            map.set(key, value);
        }
        for (const [key, value] of this.providers.entries()) {
            map.set(key, value);
        }
        return map;
    }

    dispose(): void {
        for (const p of this.providers.values()) {
            p.dispose();
        }
        this.providers.clear();
    }
}
