import { IProvider, IProviderOptions, IServiceLocator, Resolving } from '../lib';
import { Mock } from 'moq.ts';

export class MockedProvider<T> implements IProvider<T> {
    readonly mock: Mock<T>;
    resolving: Resolving;

    constructor() {
        this.mock = new Mock();
        this.resolving = 'perRequest';
    }

    clone(options?: Partial<IProviderOptions>): IProvider<T> {
        throw new Error('Not implemented');
    }

    dispose(): void {}

    resolve(locator: IServiceLocator, ...args: any[]): T {
        return this.mock.object();
    }
}
