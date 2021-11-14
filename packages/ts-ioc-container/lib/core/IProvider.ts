import { IServiceLocator, Resolveable } from './IServiceLocator';
import { IDisposable } from '../helpers/types';

export type ResolveDependency<T> = (locator: IServiceLocator, ...args: any[]) => T;

export type Tag = string | symbol;

export interface ScopeOptions {
    level: number;
    tags: Tag[];
}

export interface IProvider<T> extends IDisposable {
    clone(): IProvider<T>;

    resolve(locator: Resolveable, ...args: any[]): T;

    isValid(filters: ScopeOptions): boolean;
}

export interface IKeyedProvider<T> extends IProvider<T> {
    addKeys(...keys: ProviderKey[]): this;

    getKeys(): ProviderKey[];

    clone(): IKeyedProvider<T>;
}

export abstract class ProviderDecorator<T> implements IKeyedProvider<T> {
    constructor(private decorated: IKeyedProvider<T>) {}

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
