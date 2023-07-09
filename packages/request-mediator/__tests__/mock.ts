import { GetPropertyInteraction, It, Mock, NamedMethodInteraction, SetPropertyInteraction } from 'moq.ts';

export function createLooseMock<T>(): Mock<T> {
  const mock = new Mock<any>();
  mock
    .setup(() => It.IsAny())
    .callback((interaction) => {
      const source: { __map: any } = mock as any;
      source.__map = source.__map || {};
      if (interaction instanceof GetPropertyInteraction) {
        if (source.__map[interaction.name] === undefined) {
          source.__map[interaction.name] = (...args: unknown[]) => {
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
