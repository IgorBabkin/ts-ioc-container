import { IProvider, ScopeOptions } from '../../core/IProvider';
import { IServiceLocator } from '../../core/IServiceLocator';
import { RangeType } from '../../helpers/RangeType';

export class LevelProvider<T> implements IProvider<T> {
    constructor(private decorated: IProvider<T>, private range: RangeType) {}

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
        return this.range.includes(filters.level) && this.decorated.isValid(filters);
    }
}
