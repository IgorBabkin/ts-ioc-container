import { GetPropertyInteraction, type IMock, It, Mock, NamedMethodInteraction, SetPropertyInteraction } from 'moq.ts';

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
