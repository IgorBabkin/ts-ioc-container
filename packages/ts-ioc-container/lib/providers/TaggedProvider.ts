import { IProvider, ScopeOptions, Tag } from '../core/provider/IProvider';
import { ProviderDecorator } from '../core/provider/ProviderDecorator';
import { IProvidersMetadataCollector } from '../core/provider/IProvidersMetadataCollector';
import { constructor } from '../core/utils/types';

export class TaggedProvider<T> extends ProviderDecorator<T> {
    constructor(private provider: IProvider<T>, private readonly tags: Tag[]) {
        super(provider);
    }

    clone(): TaggedProvider<T> {
        return new TaggedProvider(this.provider.clone(), this.tags);
    }

    isValid(filters: ScopeOptions): boolean {
        const { tags } = filters;
        return this.tags.some((t) => tags.includes(t)) && this.provider.isValid(filters);
    }
}

export const createTagsDecorator =
    (metadataCollector: IProvidersMetadataCollector) =>
    (...tags: Tag[]): ClassDecorator =>
    (target) => {
        const targetClass = target as any as constructor<unknown>;
        const fn = metadataCollector.findReducerOrCreate(targetClass);
        metadataCollector.addReducer(targetClass, (builder) => fn(builder).forTags(...tags));
    };
