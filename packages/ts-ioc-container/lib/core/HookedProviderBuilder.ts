import { IDIProviderBuilder } from './IDIContainer';
import { IResolvableHook } from '../features/instanceHook/IResolvableHook';
import { ProviderBuilder } from '../features/ProviderBuilder';
import { ResolveDependency } from './provider/IProvider';
import { constructor } from '../helpers/types';

export class HookedProviderBuilder implements IDIProviderBuilder {
    constructor(private decorated: IDIProviderBuilder, private hook: IResolvableHook) {}

    fromClass<T>(value: constructor<T>): ProviderBuilder<T> {
        return this.decorated.fromClass(value).withHook(this.hook);
    }

    fromFn<T>(fn: ResolveDependency<T>): ProviderBuilder<T> {
        return this.decorated.fromFn(fn).withHook(this.hook);
    }

    fromValue<T>(value: T): ProviderBuilder<T> {
        return this.decorated.fromValue(value).withHook(this.hook);
    }
}
