import { IProvider, IServiceLocator } from '../lib';
import { GetPropertyInteraction, IMock, It, Mock, NamedMethodInteraction, SetPropertyInteraction } from 'moq.ts';

export function createMock<T>(): IMock<T> {
    const mock = new Mock<T>()
        .setup(() => It.IsAny())
        .callback((interaction) => {
            const source: { __map: any } = mock as any;
            source.__map = source.__map || {};
            if (interaction instanceof GetPropertyInteraction) {
                if (source.__map[interaction.name] === undefined) {
                    source.__map[interaction.name] = (...args: any[]) => {
                        mock.tracker.add(new NamedMethodInteraction(interaction.name, args));
                    };
                }
                return source.__map[interaction.name];
            }
            if (interaction instanceof SetPropertyInteraction) {
                return true;
            }
        });
    return mock;
}

export class MoqProvider<T> implements IProvider<T> {
    private readonly mock = createMock<T>();

    getMock(): IMock<T> {
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
