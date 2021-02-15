import { IMockFactory } from '../../lib/IMockFactory';
import { GetPropertyInteraction, It, Mock, NamedMethodInteraction, SetPropertyInteraction } from 'moq.ts';
import { IMockAdapter } from '../../lib/IMockAdapter';
import { MoqAdapter } from './MoqAdapter';

export class LooseMoqFactory implements IMockFactory<Mock<any>> {
    create(): IMockAdapter<Mock<any>, any> {
        const mock = new Mock<any>()
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
        return new MoqAdapter(mock as Mock<any>);
    }
}
