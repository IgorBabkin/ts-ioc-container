export { build, type BuildOptions, type BuildResult, type OutputResult, type OutputStatus } from './build';
export { run, type CliIo } from './cli';
export {
  loadConfig,
  resolveConfig,
  DEFAULT_CONFIG_FILE,
  DEFAULT_EXCLUDE,
  DEFAULT_MODULE_NAME,
  type TicConfig,
  type ModuleConfig,
  type NamespaceConfig,
  type ClassSelector,
  type ExportKind,
  type ResolvedSelector,
  type ResolvedConfig,
  type ResolvedModule,
} from './config';
export { ImportPaths } from './ImportPaths';
export { findClasses, listSourceFiles, type DiscoveredClass } from './scan';
export { emitModule, type EmitInput } from './emit';
export { globToRegExp } from './glob';
export { TicError, TicConfigError, NamespaceNotFoundError } from './errors';
