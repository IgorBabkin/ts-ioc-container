// eslint-disable-next-line @typescript-eslint/no-explicit-any

import { Tag } from 'ts-ioc-container';

export type constructor<T> = new (...args: any[]) => T;
export type ProviderKey = string | symbol;
export type InjectionToken<T> = ProviderKey | constructor<T>;

export type LocatorOptions<T> = {
    context?: T;
    tags?: Tag[];
};

export interface Locator {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolve<T>(key: InjectionToken<T>, ...deps: any[]): T;
    createScope<T>(options: LocatorOptions<T>): Locator;
    remove(): void;
}
