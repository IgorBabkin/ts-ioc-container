import { IMockProviderStorage, IServiceLocator, ProviderKey } from '../lib';
import { GetPropertyInteraction, IMock, It, Mock, NamedMethodInteraction, SetPropertyInteraction } from 'moq.ts';
import { MockProvider } from '../lib';

export class MoqProvider<T> extends MockProvider<T> {
    mock = new Mock<T>();

    resolve(locator: IServiceLocator, ...args: any[]): T {
        return this.mock.object();
    }
}

export class MoqProviderStorage implements IMockProviderStorage {
    private readonly mocks = new Map<ProviderKey, MoqProvider<any>>();

    constructor(private createProvider: <T>() => MoqProvider<T>) {}

    dispose(): void {
        this.mocks.clear();
    }

    findOrCreate<T>(key: ProviderKey): MoqProvider<T> {
        if (!this.mocks.has(key)) {
            this.mocks.set(key, this.createProvider<T>());
        }

        return this.mocks.get(key) as MoqProvider<T>;
    }

    findMock<T>(key: ProviderKey): IMock<T> {
        return this.findOrCreate<T>(key).mock;
    }
}

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
