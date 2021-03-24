import { InjectionToken, IServiceLocator } from '../../IServiceLocator';
import { ArgsFn } from '../..';

export interface InjectorOptions {
    type: 'factory' | 'instance';
    argsFn: ArgsFn;
}

export type Factory<T> = (...args: any[]) => T;

export interface IInjector<T> {
    resolve(locator: IServiceLocator): T | Factory<T>;
}

export class Injector<T> implements IInjector<T> {
    private readonly options: InjectorOptions;

    constructor(private token: InjectionToken<T>, options: Partial<InjectorOptions> = {}) {
        const defaultOptions: InjectorOptions = { type: 'instance', argsFn: () => [] };
        this.options = { ...defaultOptions, ...options };
    }

    resolve(locator: IServiceLocator): T | Factory<T> {
        const { type, argsFn } = this.options;
        switch (type) {
            case 'instance':
                return locator.resolve(this.token, ...argsFn(locator));

            case 'factory':
                return (...args2: any[]) => locator.resolve(this.token, ...argsFn(locator), ...args2);
        }
    }

    withArgsFn(argsFn: ArgsFn): this {
        this.options.argsFn = argsFn;
        return this;
    }
}

export class InstanceInjector<T> implements IInjector<T> {
    constructor(private value: T) {}

    resolve(locator: IServiceLocator): Factory<T> | T {
        return this.value;
    }
}
