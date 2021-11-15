import { MockProvider, ProviderKey, Resolveable, VendorMockProviderStorage } from '../lib';
import { GetPropertyInteraction, IMock, It, Mock, NamedMethodInteraction, SetPropertyInteraction } from 'moq.ts';

export class MoqProvider<T> extends MockProvider<T> {
    mock = new Mock<T>();

    resolve(locator: Resolveable, ...args: any[]): T {
        return this.mock.object();
    }
}

export class MoqProviderStorage extends VendorMockProviderStorage {
    findOrCreate<T>(key: ProviderKey): MoqProvider<T> {
        return this.storage.findOrCreate(key) as MoqProvider<T>;
    }

    findMock<T>(key: ProviderKey): IMock<T> {
        return (this.storage.findOrCreate(key) as MoqProvider<T>).mock;
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
