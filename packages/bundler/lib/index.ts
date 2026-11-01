// Entry points: the composition root and the functions that run it.
export { build, run, loadConfig, createContainer, type BundleRequest, type BuildOptions } from './app';
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
export { BuildModule } from './features/bundle/BuildModule';
export { BundleController, BUILD_OPTIONS, type BuildCliOptions } from './features/bundle/BundleController';
export {
  BundleService,
  IBundleServiceKey,
  type IBundleService,
  type Bundle,
  type BundledClass,
} from './features/bundle/services/BundleService';
export {
  TicConfigService,
  ITicConfigServiceKey,
  type ITicConfigService,
} from './features/bundle/services/TicConfigService';
export {
  resolveConfig,
  BUNDLE_CONFIG_SCHEMA,
  BUNDLE_CONFIG_FILE_SCHEMA,
  mergeConfigs,
  parseConfig,
  CONFIG_FILE_SUFFIXES,
  STDIN,
  configFormat,
  DEFAULT_TSCONFIG,
  DEFAULT_EXCLUDE,
  DEFAULT_DECORATORS,
  toClassName,
  type BundleConfigFile,
  type ClassSelector,
  type ExportKind,
  type ResolvedClassSelector,
  type PathSelector,
  type ResolvedPathSelector,
  type BundleConfig,
  type ConfigFormat,
} from './features/bundle/BuildConfig';
export { ticConfigJsonSchema } from './schema/ticConfigSchema';
export { ImportPaths } from './features/bundle/domain/ImportPaths';
export { loadImportPaths } from './features/bundle/domain/tsconfig';
export { findClasses, isSourceFile, listSourceFiles, type DiscoveredClass } from './features/bundle/domain/scan';
export {
  BundleView,
  IBundleViewKey,
  type IBundleView,
  type BundleViewInput,
  GENERATED_HEADER,
} from './features/bundle/services/BundleView';
export { tokenCollisions } from './features/bundle/domain/tokenCollisions';
export { globToRegExp } from './features/bundle/domain/glob';

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
