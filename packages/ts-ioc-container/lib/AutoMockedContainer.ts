import { IContainer, InjectionToken, IProvider, MethodNotImplementedError } from './index';

export abstract class AutoMockedContainer implements IContainer {
    createScope(): IContainer {
        throw new MethodNotImplementedError();
    }

    abstract resolve<T>(key: InjectionToken<T>): T;

    abstract dispose(): void;

    getProviders(): IProvider<unknown>[] {
        return [];
    }

    register(): this {
        throw new MethodNotImplementedError();
    }

    getInstances(): unknown[] {
        return [];
    }

    removeScope(): void {
        throw new MethodNotImplementedError();
    }
}
