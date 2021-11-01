import { IProvider, IServiceLocator } from '../../index';
import { MethodNotImplementedError } from '../../errors/MethodNotImplementedError';

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
