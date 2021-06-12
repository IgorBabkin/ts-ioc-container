import { IProvider, ProviderKey } from '../provider/IProvider';
import { InjectionToken, IServiceLocator } from '../IServiceLocator';
import { IMockAdapter } from './IMockAdapter';

export interface UnitTestServiceLocatorOptions<GMock> {
    createMock<GInstance>(): IMockAdapter<GMock, GInstance>;
}
export class UnitTestServiceLocator<GMock> implements IServiceLocator {
    private mocks: Map<ProviderKey, IMockAdapter<GMock, any>> = new Map();

    constructor(private parent: IServiceLocator, private options: UnitTestServiceLocatorOptions<GMock>) {}

    resolveMockAdapter<GInstance>(key: ProviderKey): IMockAdapter<GMock, GInstance> {
        if (!this.mocks.has(key)) {
            this.mocks.set(key, this.options.createMock<GInstance>());
        }
        return this.mocks.get(key);
    }

    resolve<GInstance>(key: InjectionToken<GInstance>, ...deps: any[]): GInstance {
        try {
            return this.parent.resolve(key, ...deps);
        } catch (e) {
            if (e.name === 'DependencyNotFoundError') {
                return this.resolveMockAdapter<GInstance>(key as ProviderKey).instance;
            }

            throw e;
        }
    }

    createContainer(): IServiceLocator {
        return new UnitTestServiceLocator(this, this.options);
    }

    remove(): void {
        this.parent = undefined;
    }

    register<GInstance>(key: ProviderKey, registration: IProvider<GInstance>): this {
        this.parent.register(key, registration);
        return this;
    }
}
