/* eslint-disable @typescript-eslint/no-non-null-assertion */
import {
    InjectionToken,
    IProvider,
    IServiceLocator,
    MethodNotImplementedError,
    ProviderKey,
    ProviderNotFoundError,
} from '../../index';
import { IMockRepository } from './IMockRepository';

export class MockedServiceLocator implements IServiceLocator {
    constructor(private decorated: IServiceLocator, private mockRepository: IMockRepository) {}

    createScope(): IServiceLocator {
        throw new MethodNotImplementedError();
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

    entries(): Array<[ProviderKey, IProvider<any>]> {
        return this.decorated.entries();
    }

    register(key: ProviderKey, provider: IProvider<unknown>): void {
        this.decorated.register(key, provider);
    }
}
