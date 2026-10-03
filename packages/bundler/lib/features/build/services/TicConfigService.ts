import path from 'node:path';
import { by, inject, register, SingleToken } from 'ts-ioc-container';
import { TicConfigError } from '../../../exceptions/DomainException';
import { type IFileSystemService, IFileSystemServiceKey } from '../../../services/NodeFileSystemService';
import { configFormat, parseConfig, type ResolvedConfig, resolveConfig, STDIN } from '../BuildConfig';

export interface ITicConfigService {
  /**
   * Reads and validates a config file: JSON for `.json`, YAML for `.yaml` / `.yml`.
   *
   * @throws {TicConfigError} when the file is missing, has another extension, cannot be parsed, or does not match the config shape.
   */
  load(file: string): ResolvedConfig;

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
   * @throws {TicConfigError} when the file is missing, has another extension, cannot be parsed, or does not match the config shape.
   */
  load(file: string): ResolvedConfig {
    const format = configFormat(file);
    if (format === undefined) throw new TicConfigError(`expected a .json, .yaml or .yml config file: ${file}`);
    if (!this.fs.fileExists(file)) throw new TicConfigError(`config file not found: ${file}`);
    return resolveConfig(parseConfig(this.fs.readFile(file), format), file);
  }

  /**
   * @throws {TicConfigError} when the text cannot be parsed, does not match the config shape, or has no `name`.
   */
  parse(text: string, dir: string): ResolvedConfig {
    return resolveConfig(parseConfig(text, 'yaml'), path.join(dir, STDIN));
  }
}
