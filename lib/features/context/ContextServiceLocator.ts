import { InjectionToken, IServiceLocator } from '../../core/IServiceLocator';
import { IProvider, ProviderKey } from '../../core/providers/IProvider';
import { ProviderBuilder } from '../ProviderBuilder';
import { ILocatorContext, ILocatorContextKey } from './ILocatorContext';
import { LocatorContext } from './LocatorContext';

export class ContextServiceLocator {
    constructor(
        private locator: IServiceLocator,
        private locatorFactory: <T>(context: T) => ILocatorContext<T> = (context) => new LocatorContext(context),
    ) {}

    createLocator<T>(context: T): ContextServiceLocator {
        return new ContextServiceLocator(
            this.locator
                .createLocator()
                .register(ILocatorContextKey, ProviderBuilder.fromInstance(this.locatorFactory(context)).asRequested()),
            this.locatorFactory,
        );
    }

    dispose(): void {
        this.locator.dispose();
    }

    register<T>(key: ProviderKey, provider: IProvider<T>): this {
        this.locator.register(key, provider);
        return this;
    }

    resolve<T>(key: InjectionToken<T>, ...deps: any[]): T {
        return this.locator.resolve(key, ...deps);
    }
}
