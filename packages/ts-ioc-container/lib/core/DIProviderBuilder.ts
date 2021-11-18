import { ProviderBuilder } from '../features/ProviderBuilder';
import { ResolveDependency } from './provider/IProvider';
import { IDIProviderBuilder } from './IDIContainer';
import { constructor } from 'helpers/types';

export class DIProviderBuilder implements IDIProviderBuilder {
    fromClass<T>(value: constructor<T>): ProviderBuilder<T> {
        return ProviderBuilder.fromClass(value);
    }

    fromValue<T>(value: T): ProviderBuilder<T> {
        return ProviderBuilder.fromValue(value);
    }

    fromFn<T>(fn: ResolveDependency<T>): ProviderBuilder<T> {
        return ProviderBuilder.fromFn(fn);
    }
}
