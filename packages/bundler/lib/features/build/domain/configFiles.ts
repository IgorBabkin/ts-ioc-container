import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { TicConfigError } from '../../../exceptions/DomainException';
import { configSuffix } from '../BuildConfig';

/**
 * The root of the package `dir` belongs to: the nearest folder, `dir` or above, with a
 * `package.json` — the project root in a single-package project, the package in a
 * monorepo. `dir` itself when no folder above has one.
 */
export function findPackageRoot(dir: string): string {
  const start = path.resolve(dir);
  for (let current = start; ; current = path.dirname(current)) {
    if (existsSync(path.join(current, 'package.json'))) return current;
    if (path.dirname(current) === current) return start;
  }
}

/**
 * The `*.bundle.{json,yaml,yml}` configs in `dir` (not its sub-folders), sorted by name.
 *
 * @throws {TicConfigError} when one bundle is described in two formats, e.g. `app.bundle.json` and `app.bundle.yaml`.
 */
export function findConfigFiles(dir: string): string[] {
  const files = readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && configSuffix(entry.name) !== undefined)
    .map((entry) => entry.name)
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  const byStem = new Map<string, string>();
  for (const file of files) {
    const stem = file.slice(0, -configSuffix(file)!.length);
    const other = byStem.get(stem);
    if (other) throw new TicConfigError(`${other} and ${file} describe the same bundle; keep one`);
    byStem.set(stem, file);
  }
  return files.map((file) => path.join(dir, file));
}
