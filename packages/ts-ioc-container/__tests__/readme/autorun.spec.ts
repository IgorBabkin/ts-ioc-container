import { Container, executeHooks, Execution, hook, MetadataInjector } from '../../lib';

const execute: Execution = (context) => context.invokeMethod({ args: [] });
const auto = (fn: Execution) => hook('__autorun__', fn);

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

    executeHooks(main, '__autorun__', { scope: new Container(new MetadataInjector()) });

    expect(main.isDone).toBe(true);
  });
});
