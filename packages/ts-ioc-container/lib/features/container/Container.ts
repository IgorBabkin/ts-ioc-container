import { Tag } from '../../core/provider/IProvider';
import { InjectionToken, IServiceLocator } from '../../core/IServiceLocator';
import { IContainer } from './IContainer';
import { IContainerProvider } from './IContainerProvider';
import { IInjector } from '../../core/IInjector';
import { ServiceLocator } from '../../core/ServiceLocator';
import { IInstanceHook } from '../../core/IInstanceHook';
import { constructor } from '../../helpers/types';

export class Container implements IContainer {
    static fromInjector(injector: IInjector): Container {
        return new Container(new ServiceLocator(injector));
    }

    constructor(private locator: IServiceLocator) {}

    setHook(hook: IInstanceHook): this {
        this.locator.setHook(hook);
        return this;
    }

    createScope(tags?: Tag[]): IContainer {
        return new Container(this.locator.createScope(tags));
    }

    register(provider: IContainerProvider<unknown>): this {
        provider.appendTo(this.locator);
        return this;
    }

    resolve<T>(key: InjectionToken<T>, ...args: any[]): T {
        return this.locator.resolve(key, ...args);
    }

    resolveDecorated<T>(...Constructors: constructor<T>[]): T | undefined {
        if (Constructors.length === 0) {
            return undefined;
        }
        const [first, ...rest] = Constructors;
        return this.locator.resolve(first, this.resolveDecorated(...rest));
    }

    dispose(): void {
        this.locator.dispose();
    }
}
