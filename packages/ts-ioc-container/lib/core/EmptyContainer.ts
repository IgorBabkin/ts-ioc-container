import { InjectionToken, IContainer } from './IContainer';
import { MethodNotImplementedError } from '../errors/MethodNotImplementedError';
import { ProviderNotFoundError } from '../errors/ProviderNotFoundError';
import { IProvider } from './provider/IProvider';

export class EmptyContainer implements IContainer {
    createScope(): IContainer {
        throw new MethodNotImplementedError();
    }

    dispose(): void {
        throw new MethodNotImplementedError();
    }

    register(): this {
        return this;
    }

    resolve<T>(key: InjectionToken<T>): T {
        throw new ProviderNotFoundError(key.toString());
    }

    getProviders(): IProvider<unknown>[] {
        return [];
    }

    setHook(): this {
        throw new MethodNotImplementedError();
    }
}
