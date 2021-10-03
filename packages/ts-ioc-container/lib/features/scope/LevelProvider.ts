import { IProvider, ScopeOptions } from '../../core/IProvider';
import { IServiceLocator } from '../../core/IServiceLocator';
import { RangeType } from '../../helpers/RangeType';

export class LevelProvider<T> implements IProvider<T> {
    active = false;

    constructor(private decorated: IProvider<T>, private range: RangeType) {
        this.active = this.decorated.active;
    }

    setLevel(level: number): this {
        this.range.includes(level);
        return this;
    }

    clone(options: ScopeOptions): IProvider<T> {
        return new LevelProvider(this.decorated.clone(options), this.range).setLevel(options.level);
    }

    dispose(): void {
        this.decorated.dispose();
    }

    resolve(locator: IServiceLocator, ...args: any[]): T {
        return this.decorated.resolve(locator, ...args);
    }
}
