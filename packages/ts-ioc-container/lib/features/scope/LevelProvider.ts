import { IKeyedProvider, ProviderDecorator, ScopeOptions } from '../../core/IProvider';

export class LevelProvider<T> extends ProviderDecorator<T> {
    constructor(private provider: IKeyedProvider<T>, private readonly range: [number, number]) {
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
