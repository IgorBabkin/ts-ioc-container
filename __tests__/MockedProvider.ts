import { IProvider, IServiceLocator } from '../lib';
import { Mock } from 'moq.ts';

export class MockedProvider<T> implements IProvider<T> {
    private readonly mock: Mock<T>;

    constructor() {
        this.mock = new Mock();
    }

    getMock(): Mock<T> {
        return this.mock;
    }

    clone(): IProvider<T> {
        return new MockedProvider();
    }

    dispose(): void {}

    resolve(locator: IServiceLocator, ...args: any[]): T {
        return this.mock.object();
    }

    canBeCloned = false;
}
