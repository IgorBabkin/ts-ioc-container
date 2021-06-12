import { GetPropertyInteraction, IMock, It, Mock, NamedMethodInteraction, SetPropertyInteraction } from 'moq.ts';
import { IMockAdapter, MockRepository } from '../lib';

export class MoqRepository extends MockRepository<IMock<any>> {
    protected createMock<GInstance>(): IMockAdapter<IMock<GInstance>, GInstance> {
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
        return {
            get instance(): GInstance {
                return mock.object();
            },
            mock,
        };
    }
}
