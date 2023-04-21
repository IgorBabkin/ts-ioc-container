import { Resolveable } from '../container/IContainer';
import { IProvider, Tagged } from './IProvider';

export abstract class ProviderDecorator<T> implements IProvider<T> {
    protected constructor(private decorated: IProvider<T>) {}

    clone(): IProvider<T> {
        return this.decorated.clone();
    }

    dispose(): void {
        this.decorated.dispose();
    }

    isValid(filters: Tagged): boolean {
        return this.decorated.isValid(filters);
    }

    resolve(container: Resolveable, ...args: any[]): T {
        return this.decorated.resolve(container, ...args);
    }
}