import { constructor, Container, IContainer, IInjector, Resolveable } from 'ts-ioc-container';
import { composeDecorators, resolve } from 'ts-constructor-injector';
import { Scope } from '../lib';
import { asSingleton, fromValue, perTags } from 'ts-ioc-container/lib';
import { IDependencyContainer } from '../lib/di/IDependencyContainer';

export const injector: IInjector = {
    resolve<T>(locator: Resolveable, value: constructor<T>, ...deps: unknown[]): T {
        return resolve(locator)(value, ...deps);
    },
};

export const perApplication = composeDecorators(perTags(Scope.Application), asSingleton);
export const perRequest = composeDecorators(perTags(Scope.Request), asSingleton);
export const perUseCase = composeDecorators(perTags(Scope.UseCase), asSingleton);

export function createContainer(): IContainer {
    return new Container(injector).setTags([Scope.Application]);
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
        this.container.register(fromValue(value).forKey(key).build());
    }

    resolve<T>(key: constructor<T> | symbol): T {
        return this.container.resolve(key);
    }
}

export const scope = (l: Resolveable) => l;

// eslint-disable-next-line @typescript-eslint/ban-types
export type EmptyType = {};
