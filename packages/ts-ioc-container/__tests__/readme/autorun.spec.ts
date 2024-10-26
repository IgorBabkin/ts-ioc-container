import { Container, HookFn, hook, MetadataInjector, runHooks } from '../../lib';

const execute: HookFn = (context) => {
  context.invokeMethod({ args: [] });
};
const auto = (fn: HookFn) => hook('__autorun__', fn);

describe('autorun', () => {
  class Main {
    isDone = false;

    @auto(execute)
    loadFile() {
      this.isDone = true;
    }
  }

  it('should run autorun function', () => {
    const main = new Main();

    runHooks(main, '__autorun__', { scope: new Container(new MetadataInjector()) });

    expect(main.isDone).toBe(true);
  });
});
