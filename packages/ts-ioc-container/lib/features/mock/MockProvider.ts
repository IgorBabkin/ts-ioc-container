import { MethodNotImplementedError } from '../../errors/MethodNotImplementedError';
import { Resolveable } from '../../core/IServiceLocator';
import { IProvider } from '../../core/provider/IProvider';

export abstract class MockProvider<T> implements IProvider<T> {
    clone(): IProvider<T> {
        throw new MethodNotImplementedError('MockProvider cannot be cloned');
    }

    dispose(): void {
        throw new MethodNotImplementedError('MockProvider cannot be disposed');
    }

    abstract resolve(locator: Resolveable, ...args: any[]): T;

    isValid(): boolean {
        return true;
    }
}
