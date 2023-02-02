import { IProvider, ScopeOptions } from '../core/provider/IProvider';
import { ProviderDecorator } from '../core/provider/ProviderDecorator';
import { IProvidersMetadataCollector } from '../core/provider/IProvidersMetadataCollector';
import { constructor } from '../core/utils/types';

export class LevelProvider<T> extends ProviderDecorator<T> {
    constructor(private provider: IProvider<T>, private readonly range: [number, number]) {
        super(provider);
    }

    clone(): LevelProvider<T> {
        return new LevelProvider(this.provider.clone(), this.range);
    }

    isValid(filters: ScopeOptions): boolean {
        const { level } = filters;
        const [from, to] = this.range;
        return from <= level && level <= to && this.provider.isValid(filters);
    }
}

export const createLevelDecorator =
    (metadataCollector: IProvidersMetadataCollector) =>
    (value: number): ClassDecorator =>
    (target) => {
        const targetClass = target as any as constructor<unknown>;
        const fn = metadataCollector.findReducerOrCreate(targetClass);
        metadataCollector.addReducer(targetClass, (builder) => fn(builder).forLevel(value));
    };
