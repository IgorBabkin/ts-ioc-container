export {
  build,
  TSCONFIG_FILE,
  type BuildOptions,
  type BuildResult,
  type OutputResult,
  type OutputStatus,
} from './build';
export { run, type CliIo } from './cli';
export {
  loadConfig,
  resolveConfig,
  CONFIG_FILE_SUFFIXES,
  findConfigFiles,
  findPackageRoot,
  DEFAULT_EXTENDS,
  DEFAULT_EXCLUDE,
  DEFAULT_BUNDLE_NAME,
  DEFAULT_DECORATORS,
  toClassName,
  type BundleConfig,
  type PathConfig,
  type ClassSelector,
  type ExportKind,
  type ResolvedClassSelector,
  type FileSelector,
  type ResolvedFileSelector,
  type ResolvedConfig,
} from './config';
export { ImportPaths } from './ImportPaths';
export { loadTsconfig, type ExtendedTsconfig } from './tsconfig';
export { findClasses, isSourceFile, listSourceFiles, type DiscoveredClass } from './scan';
export { emitBundle, GENERATED_HEADER, type EmitInput } from './emit';
export { globToRegExp } from './glob';
export { TicError, TicConfigError, NamespaceNotFoundError } from './errors';
