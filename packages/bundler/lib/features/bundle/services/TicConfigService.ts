import path from 'node:path';
import { by, inject, register, SingleToken } from 'ts-ioc-container';
import { TicConfigError } from '../../../exceptions/DomainException';
import { type IFileSystemService, IFileSystemServiceKey } from '../../../services/NodeFileSystemService';
import {
  configFormat,
  extendedFile,
  mergeConfigs,
  parseConfig,
  type BundleConfig,
  resolveConfig,
  STDIN,
} from '../BuildConfig';

/** A config as read, before it is validated. */
interface ConfigSource {
  file: string;
  content: unknown;
}

export interface ITicConfigService {
  /**
   * Reads and validates a config file: JSON for `.json`, YAML for `.yaml` / `.yml`. Given several,
   * it merges them left to right (see `mergeConfigs`); they must sit in one folder, which their
   * relative paths resolve against. A config that `extends` another is merged on top of it, the
   * same way; a config extended twice counts once.
   *
   * @throws {TicConfigError} when a file is missing, has another extension, cannot be parsed, or does not match the config shape; when several files are in different folders; when `extends` is invalid or circular.
   */
  load(files: string | string[]): BundleConfig;

  /**
   * Validates config text from somewhere other than a file — stdin, say. It is parsed as YAML,
   * which JSON is a subset of; its relative paths, `extends` included, resolve against `dir`.
   *
   * @throws {TicConfigError} when the text cannot be parsed or does not match the config shape; when a config it extends cannot be read, sits in another folder, or `extends` is invalid or circular.
   */
  parse(text: string, dir: string): BundleConfig;
}

export const ITicConfigServiceKey = new SingleToken<ITicConfigService>('ITicConfigService');

@register(ITicConfigServiceKey)
export class TicConfigService implements ITicConfigService {
  constructor(@inject(by(IFileSystemServiceKey)) private readonly fs: IFileSystemService) {}

  /**
   * @throws {TicConfigError} when a file is missing, has another extension, cannot be parsed, or does not match the config shape; when several files are in different folders; when `extends` is invalid or circular.
   */
  load(files: string | string[]): BundleConfig {
    const seen = new Set<string>();
    return this.resolve([files].flat().flatMap((file) => this.withParents(this.source(file), seen)));
  }

  /**
   * @throws {TicConfigError} when the text cannot be parsed or does not match the config shape; when a config it extends cannot be read, sits in another folder, or `extends` is invalid or circular.
   */
  parse(text: string, dir: string): BundleConfig {
    return this.resolve(
      this.withParents({ file: path.join(dir, STDIN), content: parseConfig(text, 'yaml') }, new Set()),
    );
  }

  /**
   * The configs of one bundle, in merge order; the last one is the config the bundle was asked for.
   *
   * @throws {TicConfigError} when a config does not match the config shape, or several are in different folders.
   */
  private resolve(configs: ConfigSource[]): BundleConfig {
    const { file, content } = configs[configs.length - 1];
    if (configs.length === 1) return resolveConfig(content, file);
    const folders = [...new Set(configs.map((config) => path.dirname(config.file)))];
    if (folders.length > 1) {
      throw new TicConfigError(
        `configs merged into one bundle must sit in one folder, since their relative paths resolve against it: ${folders.join(', ')}`,
      );
    }
    return resolveConfig(mergeConfigs(configs), file);
  }

  /**
   * A config preceded by what it extends, furthest first. A file in `seen` is already merged, so it adds nothing.
   *
   * @throws {TicConfigError} when `extends` is invalid or circular, or an extended file cannot be read.
   */
  private withParents(config: ConfigSource, seen: Set<string>, chain: string[] = []): ConfigSource[] {
    const trail = [...chain, config.file];
    if (chain.includes(config.file)) {
      throw new TicConfigError(`circular extends: ${trail.map((file) => path.basename(file)).join(' -> ')}`);
    }
    if (seen.has(config.file)) return [];
    seen.add(config.file);
    const parent = extendedFile(config.content, config.file);
    return [...(parent ? this.withParents(this.source(parent), seen, trail) : []), config];
  }

  /**
   * @throws {TicConfigError} when the file is missing, has another extension, or cannot be parsed.
   */
  private source(file: string): ConfigSource {
    return { file, content: this.read(file) };
  }

  /**
   * @throws {TicConfigError} when the file is missing, has another extension, or cannot be parsed.
   */
  private read(file: string): unknown {
    const format = configFormat(file);
    if (format === undefined) throw new TicConfigError(`expected a .json, .yaml or .yml config file: ${file}`);
    if (!this.fs.fileExists(file)) throw new TicConfigError(`config file not found: ${file}`);
    return parseConfig(this.fs.readFile(file), format);
  }
}
