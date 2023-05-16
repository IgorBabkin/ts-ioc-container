import { constructor, Container, IContainer, IInjector, Provider, Resolvable } from 'ts-ioc-container';
import { AsyncMethodReflector, resolve } from 'ts-constructor-injector';
import { IDependencyContainer, Scope } from '../lib';

const onDisposeReflector = new AsyncMethodReflector('onDispose');
export const onDispose = onDisposeReflector.createMethodHookDecorator();

const injector: IInjector = {
    resolve<T>(container: IContainer, value: constructor<T>, ...deps: unknown[]): T {
        return resolve(container)(value, ...deps);
    },
};

export function createContainer(): IContainer {
    return new Container(injector, { tags: [Scope.Application] });
}

export class ContainerAdapter implements IDependencyContainer {
    constructor(private container: IContainer) {}

    createScope(tags: string[]): IDependencyContainer {
        return new ContainerAdapter(this.container.createScope(tags));
    }

    dispose(): void {
        this.container.dispose();
    }

    registerValue(key: string | symbol, value: unknown): void {
        this.container.register(key, Provider.fromValue(value));
    }

    resolve<T>(key: constructor<T> | symbol): T {
        return this.container.resolve(key);
    }

    async onBeforeDispose(): Promise<void> {
        for (const instance of this.container.getInstances()) {
            // eslint-disable-next-line @typescript-eslint/ban-types
            await onDisposeReflector.invokeHooksOf(instance as object);
        }
    }
}

export const scope = (l: Resolvable) => l;

// eslint-disable-next-line @typescript-eslint/ban-types
export type EmptyType = {};
