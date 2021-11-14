import { IProvider, ProviderDecorator, ScopeOptions, Tag } from '../../core/IProvider';

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
