import { MethodNotImplementedError } from '../../errors/MethodNotImplementedError';
import { IServiceLocator } from '../../core/IServiceLocator';
import { IProvider } from '../../core/provider/IProvider';

export abstract class MockProvider<T> implements IProvider<T> {
    clone(): IProvider<T> {
        throw new MethodNotImplementedError('MockProvider cannot be cloned');
    }

    dispose(): void {
        throw new MethodNotImplementedError('MockProvider cannot be disposed');
    }

    abstract resolve(locator: IServiceLocator, ...args: any[]): T;

    isValid(): boolean {
        return true;
    }
}
