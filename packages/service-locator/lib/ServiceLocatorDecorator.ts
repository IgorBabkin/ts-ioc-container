import { IServiceLocator, constructor } from './IServiceLocator';
import { IProviderOptions, RegistrationFn, RegistrationKey } from './IRegistration';
import { InjectionToken } from './strategy/ioc/decorators';

export abstract class ServiceLocatorDecorator implements IServiceLocator {
    protected constructor(protected decorated: IServiceLocator) {}

    public createContainer(): IServiceLocator {
        return this.decorated;
    }

    public has(key: RegistrationKey): boolean {
        return this.decorated.has(key);
    }

    public registerConstructor<T>(key: RegistrationKey, value: constructor<T>, options?: IProviderOptions): this {
        this.decorated.registerConstructor(key, value, options);
        return this;
    }

    public registerFunction<T>(key: RegistrationKey, resolveFn: RegistrationFn<T>, options?: IProviderOptions): this {
        this.decorated.registerFunction(key, resolveFn, options);
        return this;
    }

    public registerInstance<T>(key: RegistrationKey, value: T): this {
        this.decorated.registerInstance(key, value);
        return this;
    }

    public remove(): void {
        this.decorated.remove();
    }

    public resolve<T>(c: InjectionToken<T>, ...deps: any[]): T {
        return this.decorated.resolve(c, ...deps);
    }
}
