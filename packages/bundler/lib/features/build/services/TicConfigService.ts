import path from 'node:path';
import { by, inject, register, SingleToken } from 'ts-ioc-container';
import { parse as parseYaml } from 'yaml';
import { globalConfig } from '../../../domain/GlobalConfig';
import { TicConfigError } from '../../../exceptions/DomainException';
import { type IFileSystemService, IFileSystemServiceKey } from '../../../services/NodeFileSystemService';
import { type ResolvedConfig, resolveConfig } from '../BuildConfig';
import { findConfigFiles, findPackageRoot } from '../domain/configFiles';

/** The tsconfig a build without a config file extends. */
export const TSCONFIG_FILE = 'tsconfig.json';

export interface ITicConfigService {
  /**
   * Reads and validates a `*.bundle.json`, `*.bundle.yaml` or `*.bundle.yml`.
   *
   * @throws {TicConfigError} when the file is missing, cannot be parsed, or does not match the config shape.
   */
  load(file: string): ResolvedConfig;

  /**
   * The configs to build, as absolute paths: the ones named (relative to the working
   * directory), else every `*.bundle.{json,yaml,yml}` at the root of the package the working
   * directory is in, else `[undefined]` — one build from that package's `tsconfig.json`
   * with default settings. Never looks past the package into a workspace root.
   *
   * @throws {TicConfigError} when none is named and the package has neither a config nor a `tsconfig.json`, or one bundle is described in two formats.
   */
  discover(named: string[]): (string | undefined)[];
}

export const ITicConfigServiceKey = new SingleToken<ITicConfigService>('ITicConfigService');

@register(ITicConfigServiceKey)
export class TicConfigService implements ITicConfigService {
  constructor(
    @inject(globalConfig('cwd')) private readonly cwd: string,
    @inject(by(IFileSystemServiceKey)) private readonly fs: IFileSystemService,
  ) {}

  /**
   * @throws {TicConfigError} when the file is missing, cannot be parsed, or does not match the config shape.
   */
  load(file: string): ResolvedConfig {
    if (!this.fs.fileExists(file)) throw new TicConfigError(`config file not found: ${file}`);
    return resolveConfig(parseConfig(file, this.fs.readFile(file)), file);
  }

  /**
   * @throws {TicConfigError} when none is named and the package has neither a config nor a `tsconfig.json`, or one bundle is described in two formats.
   */
  discover(named: string[]): (string | undefined)[] {
    if (named.length > 0) return named.map((config) => path.resolve(this.cwd, config));
    const root = findPackageRoot(this.cwd);
    const found = findConfigFiles(root);
    if (found.length > 0) return found;
    if (this.fs.fileExists(path.join(root, TSCONFIG_FILE))) return [undefined];
    throw new TicConfigError(`no *.bundle.{json,yaml,yml} or ${TSCONFIG_FILE} in ${root}; name a config with --config`);
  }
}

/**
 * Parses a config by its extension: YAML for `.yaml` / `.yml` (an empty file is `{}`), JSON otherwise.
 *
 * @throws {TicConfigError} when the text is not valid in its format.
 */
function parseConfig(file: string, text: string): unknown {
  const yaml = file.endsWith('.yaml') || file.endsWith('.yml');
  try {
    return yaml ? (parseYaml(text) ?? {}) : JSON.parse(text);
  } catch (e) {
    throw new TicConfigError(`${file} is not valid ${yaml ? 'YAML' : 'JSON'}: ${(e as Error).message}`);
  }
}
