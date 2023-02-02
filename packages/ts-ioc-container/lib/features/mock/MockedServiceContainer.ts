import { IContainer, IInstanceHook, InjectionToken, IProvider, ProviderNotFoundError, Tag } from '../../index';
import { IMockRepository } from './IMockRepository';

export class MockedServiceContainer implements IContainer {
    constructor(private decorated: IContainer, private mockRepository: IMockRepository) {}

    createScope(tags?: Tag[], parent: IContainer = this): IContainer {
        return new MockedServiceContainer(this.decorated.createScope(tags, parent), this.mockRepository);
    }

    resolve<T>(key: InjectionToken<T>, ...args: any[]): T {
        try {
            return this.decorated.resolve(key, ...args);
        } catch (e) {
            if (e instanceof ProviderNotFoundError) {
                return this.mockRepository.resolve<T>(key);
            }

            throw e;
        }
    }

    dispose(): void {
        this.mockRepository.dispose();
    }

    getProviders(): IProvider<unknown>[] {
        return this.decorated.getProviders();
    }

    register(provider: IProvider<unknown>): void {
        this.decorated.register(provider);
    }

    setHook(hook: IInstanceHook): this {
        this.decorated.setHook(hook);
        return this;
    }
}
