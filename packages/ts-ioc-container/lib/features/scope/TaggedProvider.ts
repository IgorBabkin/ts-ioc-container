import { IProvider, ScopeOptions, Tag } from '../../core/IProvider';
import { IServiceLocator } from '../../core/IServiceLocator';

export class TaggedProvider<T> implements IProvider<T> {
    constructor(private decorated: IProvider<T>, private readonly tags: Tag[]) {}

    clone(): IProvider<T> {
        return new TaggedProvider(this.decorated.clone(), this.tags);
    }

    dispose(): void {
        this.decorated.dispose();
    }

    resolve(locator: IServiceLocator, ...args: any[]): T {
        return this.decorated.resolve(locator, ...args);
    }

    isValid(filters: ScopeOptions): boolean {
        const { tags } = filters;
        return this.tags.some((t) => tags.includes(t)) && this.decorated.isValid(filters);
    }
}
