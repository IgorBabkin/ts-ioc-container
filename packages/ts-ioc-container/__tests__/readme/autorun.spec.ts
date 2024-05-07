import { autorun, startAutorun } from '../../lib';

describe('autorun', () => {
  class Main {
    isDone = false;
    @autorun(({ methodName, instance }) => {
      // @ts-ignore
      instance[methodName].apply(instance);
    })
    loadFile() {
      this.isDone = true;
    }
  }

  it('should run autorun function', () => {
    const main = new Main();

    startAutorun(main);

    expect(main.isDone).toBe(true);
  });
});
