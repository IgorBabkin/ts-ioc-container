import { IProvider, Tagged, Tag } from '../core/provider/IProvider';
import { ProviderDecorator } from '../core/provider/ProviderDecorator';
import { constructor } from '../core/utils/types';
import { providerReflector } from '../core/provider/ProviderReflector';

export class TaggedProvider<T> extends ProviderDecorator<T> {
    constructor(private provider: IProvider<T>, private readonly tags: Tag[]) {
        super(provider);
    }

    clone(): TaggedProvider<T> {
        return new TaggedProvider(this.provider.clone(), this.tags);
    }

    isValid(filters: Tagged): boolean {
        const { tags } = filters;
        return this.tags.some((t) => tags.includes(t)) && this.provider.isValid(filters);
    }
}

export const perTags =
    (...tags: Tag[]): ClassDecorator =>
    (target) => {
        const targetClass = target as any as constructor<unknown>;
        const fn = providerReflector.findReducerOrCreate(targetClass);
        providerReflector.addReducer(targetClass, (builder) => fn(builder).perTags(...tags));
    };
