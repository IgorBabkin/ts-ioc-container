import {
  hook,
  HookCollector,
  type HookFn,
  type HookType,
  type IContainerModule,
  runInOrder,
  toTask,
} from 'ts-ioc-container';

// The lifecycle infrastructure AGENTS.md requires the application to provide already ("Requirements").
export const onConstruct = (fn: HookType) => hook('onConstruct', fn);
export const execute = (): HookFn => (ctx) => {
  ctx.invokeMethod({ args: ctx.resolveArgs() }); // `@inject` parameters of the method are resolved
};

const onConstructHooks = new HookCollector({ key: 'onConstruct' });
export const OnConstructModule: IContainerModule = {
  applyTo: (container) =>
    container.getInjector().onConstructed((instance, scope) => {
      void runInOrder(onConstructHooks.getActions(instance, { scope }).map(toTask));
    }),
};
