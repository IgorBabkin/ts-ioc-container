import { InjectionToken, IServiceLocator } from '../../IServiceLocator';
import { ArgsFn } from '../../provider/IProvider';

export interface InjectorOptions {
    type: 'factory' | 'instance';
    argsFn: ArgsFn;
}

export type Factory<T> = (...args: any[]) => T;

export interface IInjectionItem<T> {
    resolve(locator: IServiceLocator): T | Factory<T>;
}

export class InjectionItem<T> implements IInjectionItem<T> {
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

export class InstanceInjectionItem<T> implements IInjectionItem<T> {
    constructor(private value: T) {}

    resolve(locator: IServiceLocator): Factory<T> | T {
        return this.value;
    }
}
