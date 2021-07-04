import { IProvider, IServiceLocator } from '../lib';
import { Mock } from 'moq.ts';

export class MoqProvider<T> implements IProvider<T> {
    canBeCloned = true;
    private readonly mock = new Mock<T>();

    getMock(): Mock<T> {
        return this.mock;
    }

    resolve(locator: IServiceLocator, ...args: any[]): T {
        return this.mock.object();
    }

    clone(): IProvider<T> {
        return new MoqProvider();
    }

    dispose(): void {}
}
