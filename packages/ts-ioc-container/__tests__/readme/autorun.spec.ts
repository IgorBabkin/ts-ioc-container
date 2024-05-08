import { auto, Container, MetadataInjector, startAutorun } from '../../lib';

describe('autorun', () => {
  class Main {
    isDone = false;
    @auto(({ methodName, instance }) => {
      // @ts-ignore
      instance[methodName].apply(instance);
    })
    loadFile() {
      this.isDone = true;
    }
  }

  it('should run autorun function', () => {
    const main = new Main();

    startAutorun(main, new Container(new MetadataInjector()));

    expect(main.isDone).toBe(true);
  });
});
