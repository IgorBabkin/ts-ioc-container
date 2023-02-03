import { constructor } from 'ts-constructor-injector';

export interface IContainer {
    registerValue(key: string | symbol, value: unknown): void;

    createScope(tags: string[]): IContainer;

    resolve<T>(QueryHandler: constructor<T> | symbol): T;

    dispose(): void;
}
