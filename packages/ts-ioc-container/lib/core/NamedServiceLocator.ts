import { InjectionToken, IServiceLocator } from './IServiceLocator';
import { IProvider, ProviderKey } from './providers/IProvider';
import { INamedServiceLocator } from './INamedServiceLocator';

export class NamedServiceLocator implements INamedServiceLocator {
    constructor(private decorated: IServiceLocator, public name?: string) {}

    createLocator(name?: string): IServiceLocator {
        return new NamedServiceLocator(this.decorated.createLocator(), name);
    }

    dispose(): void {
        this.decorated.dispose();
    }

    register<T>(key: ProviderKey, provider: IProvider<T>): this {
        this.decorated.register(key, provider);
        return this;
    }

    resolve<T>(key: InjectionToken<T>, ...deps: any[]): T {
        return this.decorated.resolve(key, ...deps);
    }
}
