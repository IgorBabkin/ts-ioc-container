import { ProviderKey } from '../lib';
import { GetPropertyInteraction, IMock, It, Mock, NamedMethodInteraction, SetPropertyInteraction } from 'moq.ts';

export class MockRepository {
    private mocks = new Map<ProviderKey, IMock<any>>();

    findOrCreate<GInstance>(key: ProviderKey): IMock<GInstance> {
        if (!this.mocks.has(key)) {
            this.mocks.set(key, this.createMock<GInstance>());
        }

        return this.mocks.get(key) as IMock<GInstance>;
    }

    protected createMock<GInstance>(): IMock<GInstance> {
        const mock = new Mock<GInstance>()
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
}
