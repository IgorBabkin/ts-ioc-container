import { IProvider, Tag } from './provider/IProvider';
import { InjectionToken, IServiceLocator, ProviderKey } from './IServiceLocator';

export abstract class ServiceLocatorDecorator implements IServiceLocator {
    constructor(private decorated: IServiceLocator) {}

    abstract createScope(tags?: Tag[]): IServiceLocator;

    dispose(): void {
        this.decorated.dispose();
    }

    entries(): Array<[ProviderKey, IProvider<any>]> {
        return this.decorated.entries();
    }

    register(key: ProviderKey, provider: IProvider<unknown>): void {
        this.decorated.register(key, provider);
    }

    resolve<T>(key: InjectionToken<T>, ...args: any[]): T {
        return this.decorated.resolve(key, ...args);
    }
}
