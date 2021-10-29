import { IProvider, ScopeOptions } from '../../core/IProvider';
import { IServiceLocator } from '../../core/IServiceLocator';

export class LevelProvider<T> implements IProvider<T> {
    constructor(private decorated: IProvider<T>, private readonly range: [number, number]) {}

    clone(): IProvider<T> {
        return new LevelProvider(this.decorated.clone(), this.range);
    }

    dispose(): void {
        this.decorated.dispose();
    }

    resolve(locator: IServiceLocator, ...args: any[]): T {
        return this.decorated.resolve(locator, ...args);
    }

    isValid(filters: ScopeOptions): boolean {
        const { level } = filters;
        const [from, to] = this.range;
        return from <= level && level <= to && this.decorated.isValid(filters);
    }
}
