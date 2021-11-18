import { IKeyedProvider, Tag } from './provider/IProvider';
import { InjectionToken, IServiceLocator, RegisterOptions } from './IServiceLocator';
import { NoRegistrationKeysProvided } from '../errors/NoRegistrationKeysProvided';
import { IDIContainer } from './IDIContainer';

export class DIContainer implements IDIContainer {
    constructor(private locator: IServiceLocator) {}

    createScope(tags?: Tag[]): IDIContainer {
        return new DIContainer(this.locator.createScope(tags));
    }

    register(provider: IKeyedProvider<unknown>, options?: Partial<RegisterOptions>): this {
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
