import 'reflect-metadata';
import path from 'node:path';
import { Container, type IContainer } from 'ts-ioc-container';
import { Application } from './cli/Application';
import { type CliIo, processIo } from './domain/CliIo';
import { type BundleConfig } from './features/bundle/BuildConfig';
import { BuildModule } from './features/bundle/BuildModule';
import { ITicConfigServiceKey } from './features/bundle/services/TicConfigService';
import { type Bundle, IBundleServiceKey } from './features/bundle/services/BundleService';
import { HelpModule } from './features/help/HelpModule';
import { CommonModule } from './modules/CommonModule';

/** What one build does. Paths resolve against the run's working directory. */
export type BundleRequest =
  | {
      /**
       * Path of the config file — `*.json`, `*.yaml` or `*.yml` — relative to the working directory;
       * or of several in one folder, merged left to right into one bundle.
       */
      config: string | string[];
    }
  | {
      /**
       * The config as text, e.g. read from stdin: YAML or JSON. Its relative paths resolve
       * against the working directory, and it must set `name`.
       */
      text: string;
    };

export type BuildOptions = BundleRequest & {
  /** Default `process.cwd()`. */
  cwd?: string;
};

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
 * Generates the bundle a config file describes — `tic build` as a function — and returns
 * it; nothing is written.
 *
 * @throws {TicConfigError} when a config file is missing or unreadable, several are in different folders, the config or its tsconfig is invalid, the bundle has no name, or no tsconfig paths alias covers a selected class's file.
 * @throws {NamespaceNotFoundError} when a path is neither a folder nor a tsconfig paths alias of one.
 */
export function build({ cwd = process.cwd(), ...request }: BuildOptions): Bundle {
  return withContainer({ ...processIo(), cwd }, (container) => {
    const configService = ITicConfigServiceKey.resolve(container);
    const config =
      'text' in request
        ? configService.parse(request.text, cwd)
        : configService.load([request.config].flat().map((file) => path.resolve(cwd, file)));
    return IBundleServiceKey.resolve(container).bundle(config);
  });
}

/**
 * Reads and validates a config file: JSON for `.json`, YAML for `.yaml` / `.yml`. Given several
 * in one folder, it merges them left to right, as `tic build a.bundle.yml b.bundle.yml` does.
 *
 * @throws {TicConfigError} when a file is missing, has another extension, cannot be parsed, or does not match the config shape; when several files are in different folders.
 */
export function loadConfig(files: string | string[]): BundleConfig {
  return withContainer(processIo(), (container) => ITicConfigServiceKey.resolve(container).load(files));
}
