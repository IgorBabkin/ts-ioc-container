import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { register, SingleToken } from 'ts-ioc-container';

/** The files a build reads and writes. Paths are absolute. */
export interface IFileSystemService {
  fileExists(file: string): boolean;
  /**
   * @throws {Error} when the file cannot be read, e.g. it does not exist (`ENOENT`).
   */
  readFile(file: string): string;
  /** Creates missing parent folders. */
  writeFile(file: string, content: string): void;
}

export const IFileSystemServiceKey = new SingleToken<IFileSystemService>('IFileSystemService');

@register(IFileSystemServiceKey)
export class NodeFileSystemService implements IFileSystemService {
  fileExists(file: string): boolean {
    return existsSync(file);
  }

  /**
   * @throws {Error} when the file cannot be read, e.g. it does not exist (`ENOENT`).
   */
  readFile(file: string): string {
    return readFileSync(file, 'utf8');
  }

  writeFile(file: string, content: string): void {
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, content);
  }
}
