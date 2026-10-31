import path from 'node:path';
import { by, inject, register, SingleToken } from 'ts-ioc-container';
import { TicConfigError } from '../../../exceptions/DomainException';
import { type IFileSystemService, IFileSystemServiceKey } from '../../../services/NodeFileSystemService';
import { configFormat, mergeConfigs, parseConfig, type ResolvedConfig, resolveConfig, STDIN } from '../BuildConfig';

export interface ITicConfigService {
  /**
   * Reads and validates a config file: JSON for `.json`, YAML for `.yaml` / `.yml`. Given several,
   * it merges them left to right (see `mergeConfigs`); they must sit in one folder, which their
   * relative paths resolve against, and the last one names the bundle unless one sets `name`.
   *
   * @throws {TicConfigError} when a file is missing, has another extension, cannot be parsed, or does not match the config shape; when several files are in different folders.
   */
  load(files: string | string[]): ResolvedConfig;

  /**
   * Validates config text from somewhere other than a file — stdin, say. It is parsed as YAML,
   * which JSON is a subset of; its relative paths resolve against `dir`, and it has no file
   * name to take the bundle name from, so it must set `name`.
   *
   * @throws {TicConfigError} when the text cannot be parsed, does not match the config shape, or has no `name`.
   */
  parse(text: string, dir: string): ResolvedConfig;
}

export const ITicConfigServiceKey = new SingleToken<ITicConfigService>('ITicConfigService');

@register(ITicConfigServiceKey)
export class TicConfigService implements ITicConfigService {
  constructor(@inject(by(IFileSystemServiceKey)) private readonly fs: IFileSystemService) {}

  /**
   * @throws {TicConfigError} when a file is missing, has another extension, cannot be parsed, or does not match the config shape; when several files are in different folders.
   */
  load(files: string | string[]): ResolvedConfig {
    if (typeof files === 'string' || files.length === 1) {
      const [file] = [files].flat();
      return resolveConfig(this.read(file), file);
    }
    const folders = [...new Set(files.map((file) => path.dirname(file)))];
    if (folders.length > 1) {
      throw new TicConfigError(
        `configs merged into one bundle must sit in one folder, since their relative paths resolve against it: ${folders.join(', ')}`,
      );
    }
    return resolveConfig(
      mergeConfigs(files.map((file) => ({ file, content: this.read(file) }))),
      files[files.length - 1],
    );
  }

  /**
   * @throws {TicConfigError} when the text cannot be parsed, does not match the config shape, or has no `name`.
   */
  parse(text: string, dir: string): ResolvedConfig {
    return resolveConfig(parseConfig(text, 'yaml'), path.join(dir, STDIN));
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
