import { IContainer, InjectionToken, IProvider, MethodNotImplementedError, ProviderKey } from '../index';

export abstract class AutoMockedContainer implements IContainer {
    createScope(): IContainer {
        throw new MethodNotImplementedError();
    }

    abstract resolve<T>(key: InjectionToken<T>): T;

    abstract dispose(): void;

    getProviders(): Map<ProviderKey, IProvider<unknown>> {
        return new Map();
    }

    register(): this {
        throw new MethodNotImplementedError();
    }

    getInstances(): unknown[] {
        return [];
    }

    removeScope(): void {}
}
