import { Resolvable, Tagged } from '../container/IContainer';
import { IProvider } from './IProvider';

export abstract class ProviderDecorator<T> implements IProvider<T> {
    protected constructor(private decorated: IProvider<T>) {}

    clone(): IProvider<T> {
        return this.decorated.clone();
    }

    isValid(filters: Tagged): boolean {
        return this.decorated.isValid(filters);
    }

    resolve(container: Resolvable, ...args: any[]): T {
        return this.decorated.resolve(container, ...args);
    }
}
