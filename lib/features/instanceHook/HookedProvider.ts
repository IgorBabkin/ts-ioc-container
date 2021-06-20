import { IServiceLocator } from '../../core/IServiceLocator';
import { IProvider, IProviderOptions, Resolving } from '../../core/IProvider';

export abstract class HookedProvider<GInstance> implements IProvider<GInstance> {
    constructor(protected decorated: IProvider<GInstance>) {}

    abstract clone(options?: Partial<IProviderOptions>): IProvider<GInstance>;

    get resolving(): Resolving {
        return this.decorated.resolving;
    }

    dispose(): void {
        this.decorated.dispose();
        this.onDispose();
    }

    resolve(locator: IServiceLocator, ...args: any[]): GInstance {
        return this.decorated.resolve(locator, ...args);
    }

    protected abstract onDispose(): void;
}
