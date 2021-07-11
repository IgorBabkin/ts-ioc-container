import { InjectionToken, IServiceLocator } from '../core/IServiceLocator';
import { IProvider, ProviderKey } from '../core/providers/IProvider';

export interface IServiceLocatorHook {
    onBeforeRegister<T>(provider: IProvider<T>): IProvider<T>;
}

export class HookServiceLocator implements IServiceLocator {
    constructor(private decorated: IServiceLocator, private hook: IServiceLocatorHook) {}

    createLocator(): IServiceLocator {
        return new HookServiceLocator(this.decorated.createLocator(), this.hook);
    }

    dispose(): void {
        this.decorated.dispose();
    }

    register<T>(key: ProviderKey, provider: IProvider<T>): this {
        this.decorated.register(key, this.hook.onBeforeRegister(provider));
        return this;
    }

    resolve<T>(key: InjectionToken<T>, ...deps: any[]): T {
        return this.decorated.resolve(key, ...deps);
    }
}
