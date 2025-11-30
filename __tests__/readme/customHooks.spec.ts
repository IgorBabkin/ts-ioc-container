import { Container, hook, HooksRunner, type HookFn } from '../../lib';

const customHookRunner = new HooksRunner('customHook');
const execute: HookFn = (ctx) => {
  ctx.invokeMethod({ args: ctx.resolveArgs() });
};

describe('Custom Hooks', () => {
  it('should create and execute custom hooks', () => {
    class MyService {
      isInitialized = false;

      @hook('customHook', execute)
      initialize() {
        this.isInitialized = true;
      }
    }

    const container = new Container().addOnConstructHook((instance, scope) => {
      customHookRunner.execute(instance, { scope });
    });

    const service = container.resolve(MyService);

    expect(service.isInitialized).toBe(true);
  });
});
