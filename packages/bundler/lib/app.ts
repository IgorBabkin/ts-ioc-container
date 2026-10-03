import 'reflect-metadata';
import { Container, type IContainer } from 'ts-ioc-container';
import { Application } from './cli/Application';
import { type CliIo, processIo } from './domain/CliIo';
import { type ResolvedConfig } from './features/build/BuildConfig';
import { BuildModule } from './features/build/BuildModule';
import { type BuildOptions, type BuildResult, IBundleBuilderKey } from './features/build/services/BundleBuilder';
import { ITicConfigServiceKey } from './features/build/services/TicConfigService';
import { HelpModule } from './features/help/HelpModule';
import { CommonModule } from './modules/CommonModule';

/** The composition root: one container per run, holding every module of the CLI. */
export function createContainer(io: CliIo = processIo()): IContainer {
  return new Container({ tags: ['root'] })
    .useModule(new CommonModule(io))
    .useModule(new BuildModule())
    .useModule(new HelpModule());
}

function withContainer<T>(io: CliIo, fn: (container: IContainer) => T): T {
  const container = createContainer(io);
  try {
    return fn(container);
  } finally {
    container.dispose();
  }
}

/** Runs the `tic` CLI and returns its exit code; output goes through `io`. */
export function run(argv: string[], io: CliIo = processIo()): number {
  return Application.bootstrap(createContainer(io)).run(...argv);
}

/**
 * Generates the bundle a config describes — one `tic build` step as a function. Nothing is
 * written unless generation succeeds.
 *
 * @throws {TicConfigError} when the config or its tsconfig is missing or invalid.
 * @throws {NamespaceNotFoundError} when a path is neither a folder nor a tsconfig paths alias of one.
 */
export function build({ cwd = process.cwd(), ...request }: BuildOptions): BuildResult {
  return withContainer({ ...processIo(), cwd }, (container) => IBundleBuilderKey.resolve(container).build(request));
}

/**
 * Reads and validates a `*.bundle.json`, `*.bundle.yaml` or `*.bundle.yml`.
 *
 * @throws {TicConfigError} when the file is missing, cannot be parsed, or does not match the config shape.
 */
export function loadConfig(file: string): ResolvedConfig {
  return withContainer(processIo(), (container) => ITicConfigServiceKey.resolve(container).load(file));
}
