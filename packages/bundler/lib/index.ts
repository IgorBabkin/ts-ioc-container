// Entry points: the composition root and the functions that run it.
export { build, run, loadConfig, createContainer } from './app';
export { type CliIo, CliIoKey } from './domain/CliIo';
export { type GlobalConfig, GlobalConfigKey, globalConfig } from './domain/GlobalConfig';

// CLI framework: controllers are registered under their command name and declare actions as hooks.
export {
  Application,
  action,
  onDefault,
  DEFAULT_ACTION,
  commandArgs,
  parseOptions,
  validate,
  type IErrorHandler,
  IErrorHandlerKey,
  USAGE,
} from './cli';

// Feature: build
export { BuildModule } from './features/build/BuildModule';
export { BuildController, BUILD_OPTIONS, type BuildCliOptions } from './features/build/BuildController';
export {
  BundleBuilder,
  IBundleBuilderKey,
  type IBundleBuilder,
  type BuildRequest,
  type BuildOptions,
  type BuildResult,
} from './features/build/services/BundleBuilder';
export {
  TicConfigService,
  ITicConfigServiceKey,
  type ITicConfigService,
} from './features/build/services/TicConfigService';
export {
  resolveConfig,
  BUNDLE_CONFIG_SCHEMA,
  parseConfig,
  CONFIG_FILE_SUFFIXES,
  STDIN,
  configFormat,
  DEFAULT_TSCONFIG,
  DEFAULT_EXCLUDE,
  DEFAULT_DECORATORS,
  toClassName,
  type BundleConfig,
  type ClassSelector,
  type ExportKind,
  type ResolvedClassSelector,
  type GlobSelector,
  type ResolvedGlobSelector,
  type ResolvedConfig,
  type ConfigFormat,
} from './features/build/BuildConfig';
export { ticConfigJsonSchema } from './schema/ticConfigSchema';
export { ImportPaths } from './features/build/domain/ImportPaths';
export { loadImportPaths } from './features/build/domain/tsconfig';
export { findClasses, isSourceFile, listSourceFiles, type DiscoveredClass } from './features/build/domain/scan';
export {
  emitBundle,
  bundleView,
  BUNDLE_PROTOCOL,
  GENERATED_HEADER,
  type EmitInput,
  type BundleView,
} from './features/build/domain/emit';
export { tokenCollisions } from './features/build/domain/tokenCollisions';
export { globToRegExp } from './features/build/domain/glob';

// Feature: help / version
export { HelpModule } from './features/help/HelpModule';

// Shared services
export { CommonModule } from './modules/CommonModule';
export { type IOutputService, IOutputServiceKey, StdOutputService } from './services/OutputService';
export { type ILogger, ILoggerKey, ConsoleLogger } from './services/ConsoleLogger';
export {
  type IFileSystemService,
  IFileSystemServiceKey,
  NodeFileSystemService,
} from './services/NodeFileSystemService';
export {
  type IRenderService,
  IRenderServiceKey,
  HandlebarsRenderService,
  renderProtocol,
} from './services/HandlebarsRenderService';

// Errors
export {
  TicError,
  TicConfigError,
  NamespaceNotFoundError,
  MissingCommandError,
  UnknownCommandError,
  UnknownActionError,
  UsageError,
} from './exceptions/DomainException';
export { ExceptionHandler } from './exceptions/ExceptionHandler';
