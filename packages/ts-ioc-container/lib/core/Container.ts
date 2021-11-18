import { IKeyedProvider, Tag } from './provider/IProvider';
import { InjectionToken, IServiceLocator, RegisterOptions } from './IServiceLocator';
import { NoRegistrationKeysProvided } from '../errors/NoRegistrationKeysProvided';
import { IContainer } from './IContainer';

export class Container implements IContainer {
    constructor(private locator: IServiceLocator) {}

    createScope(tags?: Tag[]): IContainer {
        return new Container(this.locator.createScope(tags));
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
