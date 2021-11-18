import { Tag } from './provider/IProvider';
import { InjectionToken, IServiceLocator, RegisterOptions } from './IServiceLocator';
import { NoRegistrationKeysProvided } from '../errors/NoRegistrationKeysProvided';
import { IDIContainer, IDIProviderBuilder, RegistrationFn } from './IDIContainer';
import { DIProviderBuilder } from './DIProviderBuilder';

export class DIContainer implements IDIContainer {
    constructor(
        private locator: IServiceLocator,
        private providerBuilder: IDIProviderBuilder = new DIProviderBuilder(),
    ) {}

    createScope(tags?: Tag[]): IDIContainer {
        return new DIContainer(this.locator.createScope(tags), this.providerBuilder);
    }

    register(fn: RegistrationFn, options?: Partial<RegisterOptions>): this {
        const provider = fn(this.providerBuilder);
        const keys = provider.getKeys();
        if (keys.length === 0) {
            throw new NoRegistrationKeysProvided();
        }
        for (const key of keys) {
            this.locator.register(key, provider, options);
        }
        return this;
    }

    resolve<T>(key: InjectionToken<T>, ...args: any[]): T {
        return this.locator.resolve(key, ...args);
    }

    dispose(): void {
        this.locator.dispose();
    }
}
