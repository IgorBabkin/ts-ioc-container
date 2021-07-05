import { IServiceLocator } from '../../core/IServiceLocator';
import { IProvider } from '../../core/providers/IProvider';

export abstract class HookedProvider<GInstance> implements IProvider<GInstance> {
    constructor(protected decorated: IProvider<GInstance>) {}

    abstract clone(): IProvider<GInstance>;

    dispose(): void {
        this.decorated.dispose();
        this.onDispose();
    }

    resolve(locator: IServiceLocator, ...args: any[]): GInstance {
        const instance = this.decorated.resolve(locator, ...args);
        this.onResolve(instance);
        return instance;
    }

    protected abstract onDispose(): void;

    canBeCloned = false;

    protected abstract onResolve(instance: GInstance): void;
}
