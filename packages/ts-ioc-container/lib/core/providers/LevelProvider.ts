import { IProvider } from './IProvider';
import { IServiceLocator } from '../IServiceLocator';
import { ProviderMismatchLevelError } from '../../errors/ProviderMismatchLevelError';
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
        if (!this.range.isValid(locator.level)) {
            throw new ProviderMismatchLevelError(this.range, locator.level);
        }
        return this.decorated.resolve(locator, ...args);
    }
}
