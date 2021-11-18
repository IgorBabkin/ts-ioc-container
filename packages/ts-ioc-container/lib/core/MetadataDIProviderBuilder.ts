import { IDIProviderBuilder } from './IDIContainer';
import { IProvidersMetadataCollector } from '../features/scope/IProvidersMetadataCollector';
import { ProviderBuilder } from '../features/ProviderBuilder';
import { ResolveDependency } from './provider/IProvider';
import { DIProviderBuilder } from './DIProviderBuilder';
import { constructor } from 'helpers/types';

export abstract class DIProviderBuilderDecorator implements IDIProviderBuilder {
    constructor(private decorated: IDIProviderBuilder) {
        this.fromClass = this.fromClass.bind(this);
        this.fromValue = this.fromValue.bind(this);
        this.fromFn = this.fromFn.bind(this);
    }

    fromClass<T>(target: constructor<T>): ProviderBuilder<T> {
        return this.decorated.fromClass(target);
    }

    fromValue<T>(value: T): ProviderBuilder<T> {
        return this.decorated.fromValue(value);
    }

    fromFn<T>(fn: ResolveDependency<T>): ProviderBuilder<T> {
        return this.decorated.fromFn(fn);
    }
}

export class MetadataDIProviderBuilder extends DIProviderBuilderDecorator {
    constructor(
        private metadataCollector: IProvidersMetadataCollector,
        private builder: IDIProviderBuilder = new DIProviderBuilder(),
    ) {
        super(builder);
    }

    fromClass<T>(target: constructor<T>): ProviderBuilder<T> {
        return this.builder.fromClass(target).withReducer(this.metadataCollector.findReducerOrCreate(target));
    }
}
