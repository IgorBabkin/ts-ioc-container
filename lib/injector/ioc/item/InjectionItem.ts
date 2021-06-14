import { InjectionToken, IServiceLocator } from '../../../IServiceLocator';
import { ArgsFn } from '../../../provider/IProvider';
import { IInjectionItem } from './IInjectionItem';
import { Factory } from '../../../helpers/types';
import { UnknownInjectionTypeError } from '../../../errors/UnknownInjectionTypeError';

export interface InjectorOptions {
    type: 'factory' | 'instance';
    argsFn: ArgsFn;
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

            default:
                throw new UnknownInjectionTypeError(type);
        }
    }

    withArgsFn(argsFn: ArgsFn): this {
        this.options.argsFn = argsFn;
        return this;
    }
}
