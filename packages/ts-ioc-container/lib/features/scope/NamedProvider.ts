import { IProvider, ScopeOptions } from '../../core/IProvider';
import { IServiceLocator } from '../../core/IServiceLocator';

export class NamedProvider<T> implements IProvider<T> {
    active = false;
    constructor(private decorated: IProvider<T>, private scopeName: string) {}

    setName(value?: string): this {
        this.active = this.scopeName === value;
        return this;
    }

    clone(options: ScopeOptions): IProvider<T> {
        return new NamedProvider(this.decorated.clone(options), this.scopeName).setName(options.name);
    }

    dispose(): void {
        this.decorated.dispose();
    }

    resolve(locator: IServiceLocator, ...args: any[]): T {
        return this.decorated.resolve(locator, ...args);
    }
}
