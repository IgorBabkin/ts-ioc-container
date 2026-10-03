import { type InjectFn, SingleToken } from 'ts-ioc-container';

/** Settings every service shares for one run: the process-level context the CLI was started in. */
export type GlobalConfig = {
  /** Directory relative paths (`<output>`, the config's paths) resolve against. */
  cwd: string;
};

export const GlobalConfigKey = new SingleToken<GlobalConfig>('GlobalConfig');

/** Injects one field of the {@link GlobalConfig}: `@inject(globalConfig('cwd'))`. */
export const globalConfig =
  <K extends keyof GlobalConfig>(key: K): InjectFn<GlobalConfig[K]> =>
  ({ scope }) =>
    GlobalConfigKey.resolve(scope)[key];
