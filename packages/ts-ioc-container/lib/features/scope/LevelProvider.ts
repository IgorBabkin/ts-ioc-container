import { IProvider, ScopeOptions } from '../../core/IProvider';
import { IServiceLocator } from '../../core/IServiceLocator';
import { RangeType } from '../../helpers/RangeType';
import { ProviderNotClonedError } from '../../errors/ProviderNotClonedError';
import { ProviderMismatchLevelError } from '../../errors/ProviderMismatchLevelError';

export class LevelProvider<T> implements IProvider<T> {
    constructor(private decorated: IProvider<T>, private range: RangeType) {}

    clone(options: ScopeOptions): IProvider<T> {
        if (!this.range.includes(options.level)) {
            throw new ProviderNotClonedError(
                `Expected level range is ${this.range.toString()}. Actual is ${options.level}`,
            );
        }
        return new LevelProvider(this.decorated.clone(options), this.range);
    }

    dispose(): void {
        this.decorated.dispose();
    }

    resolve(locator: IServiceLocator, ...args: any[]): T {
        if (!this.range.includes(locator.level)) {
            throw new ProviderMismatchLevelError(this.range, locator.level);
        }
        return this.decorated.resolve(locator, ...args);
    }
}
