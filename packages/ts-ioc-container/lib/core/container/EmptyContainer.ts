import { IContainer, InjectionToken } from './IContainer';
import { MethodNotImplementedError } from '../utils/MethodNotImplementedError';
import { ProviderNotFoundError } from '../provider/ProviderNotFoundError';
import { IProvider } from '../provider/IProvider';

export class EmptyContainer implements IContainer {
    createScope(): IContainer {
        throw new MethodNotImplementedError();
    }

    dispose(): void {
        throw new MethodNotImplementedError();
    }

    register(): this {
        throw new MethodNotImplementedError();
    }

    resolve<T>(key: InjectionToken<T>): T {
        throw new ProviderNotFoundError(`Cannot find ${key.toString()}`);
    }

    getProviders(): IProvider<unknown>[] {
        return [];
    }

    getInstances(): unknown[] {
        return [];
    }
}
