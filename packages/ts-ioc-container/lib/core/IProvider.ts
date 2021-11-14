import { IServiceLocator, Resolveable } from './IServiceLocator';
import { IDisposable } from '../helpers/types';

export type ResolveDependency<T> = (locator: IServiceLocator, ...args: any[]) => T;

export type Tag = string | symbol;

export interface ScopeOptions {
    level: number;
    tags: Tag[];
}

export interface IProvider<T> extends IDisposable {
    addKeys(...keys: ProviderKey[]): this;

    getKeys(): ProviderKey[];

    clone(): IProvider<T>;

    resolve(locator: Resolveable, ...args: any[]): T;

    isValid(filters: ScopeOptions): boolean;
}

export abstract class ProviderDecorator<T> implements IProvider<T> {
    constructor(private decorated: IProvider<T>) {}

    addKeys(...keys: ProviderKey[]): this {
        this.decorated.addKeys(...keys);
        return this;
    }

    abstract clone(): ProviderDecorator<T>;

    dispose(): void {
        this.decorated.dispose();
    }

    getKeys(): ProviderKey[] {
        return this.decorated.getKeys();
    }

    isValid(filters: ScopeOptions): boolean {
        return this.decorated.isValid(filters);
    }

    resolve(locator: Resolveable, ...args: any[]): T {
        return this.decorated.resolve(locator, ...args);
    }
}

export type ProviderKey = string | symbol;
