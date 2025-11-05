import { Container, hook, type HookFn, SyncHooksRunner } from '../../lib';

const execute: HookFn = (context) => {
  context.invokeMethod({ args: [] });
};
const auto = (fn: HookFn) => hook('__autorun__', fn);

const autorunHookRunner = new SyncHooksRunner('__autorun__');
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

    autorunHookRunner.execute(main, { scope: new Container() });

    expect(main.isDone).toBe(true);
  });
});
