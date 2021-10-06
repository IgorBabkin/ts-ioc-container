import { IProvider, ScopeOptions } from '../../core/IProvider';
import { IServiceLocator } from '../../core/IServiceLocator';
import { RangeType } from '../../helpers/RangeType';

export class LevelProvider<T> implements IProvider<T> {
    private readonly range: RangeType;

    constructor(private decorated: IProvider<T>, range: [number, number]) {
        this.range = new RangeType(range);
    }

    clone(): IProvider<T> {
        return new LevelProvider(this.decorated.clone(), this.range.toTuple());
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
