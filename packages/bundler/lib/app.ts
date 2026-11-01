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
    }
  | {
      /**
       * A tsconfig, relative to the working directory: the bundle imports through its `paths`
       * aliases and scans the folders they point to, as a config's `tsconfig` field does.
       */
      tsconfig?: string;
      /**
       * Folders, files or globs to scan besides, relative to the working directory, as in
       * `paths.include`; required without `tsconfig`, when `./tsconfig.json` supplies the aliases.
       */
      include?: string[];
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
 * it; nothing is written. Given `tsconfig` and `include` instead, the bundle is `AppBundle`,
 * built as `tic build tsconfig.json 'src/**\/*.ts'` builds it.
 *
 * @throws {TicConfigError} when a config file or tsconfig is missing or unreadable, several configs are in different folders, the config or its tsconfig is invalid, the bundle has no name, there is neither a tsconfig nor paths to scan, or no tsconfig paths alias covers a selected class's file.
 * @throws {NamespaceNotFoundError} when a path is neither a source file, a folder, a tsconfig paths alias of one nor a glob in one.
 */
export function build({ cwd = process.cwd(), ...request }: BuildOptions): Bundle {
  return withContainer({ ...processIo(), cwd }, (container) => {
    const configService = ITicConfigServiceKey.resolve(container);
    const config =
      'text' in request
        ? configService.parse(request.text, cwd)
        : 'config' in request
          ? configService.load([request.config].flat().map((file) => path.resolve(cwd, file)))
          : configService.fromProject({
              dir: cwd,
              tsconfig: request.tsconfig === undefined ? undefined : path.resolve(cwd, request.tsconfig),
              include: request.include,
            });
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
