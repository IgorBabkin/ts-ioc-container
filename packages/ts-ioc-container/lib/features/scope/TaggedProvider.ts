import { IProvider, ScopeOptions } from '../../core/IProvider';
import { IServiceLocator } from '../../core/IServiceLocator';
import { MathSet } from '../../helpers/MathSet';

export class TaggedProvider<T> implements IProvider<T> {
    constructor(private decorated: IProvider<T>, private readonly tags: MathSet<string>) {}

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
        const scopeTags = MathSet.fromArray(filters.tags);
        return this.tags.hasIntersection(scopeTags) && this.decorated.isValid(filters);
    }
}
