import { constructor, Disposable } from './utils/types';
import { IContainer } from './container/IContainer';

export type VisitInstance = (instance: unknown) => Promise<void>;

export interface Traversable {
    getInstances(): unknown[];
}

export interface IInjector extends Disposable, Traversable {
    resolve<T>(container: IContainer, value: constructor<T>, ...deps: any[]): T;

    clone(): IInjector;
}

export abstract class Injector implements IInjector {
    private values: unknown[] = [];

    abstract clone(): IInjector;

    getInstances(): unknown[] {
        return this.values;
    }

    dispose(): void {
        this.values = [];
    }

    resolve<T>(container: IContainer, value: constructor<T>, ...deps: any[]): T {
        const instance = this.resolver(container, value, ...deps);
        this.values.push(value);
        return instance;
    }

    protected abstract resolver<T>(container: IContainer, value: constructor<T>, ...args: any[]): T;
}
