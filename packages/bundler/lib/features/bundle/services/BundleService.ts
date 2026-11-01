import path from 'node:path';
import { by, inject, register, SingleToken } from 'ts-ioc-container';
import { type IFileSystemService, IFileSystemServiceKey } from '../../../services/NodeFileSystemService';
import { TicConfigError } from '../../../exceptions/DomainException';
import type { BundleConfig } from '../BuildConfig';
import { GENERATED_HEADER, type IBundleView, IBundleViewKey } from './BundleView';
import { globToRegExp, toPosix } from '../domain/glob';
import { findClasses, listSourceFiles } from '../domain/scan';
import { tokenCollisions } from '../domain/tokenCollisions';
import { loadImportPaths } from '../domain/tsconfig';

export interface Bundle {
  /** Name of the generated class. */
  bundle: string;
  registrations: number;
  /** Absolute paths of the files the bundle imports from, sorted. */
  files: string[];
  /** The generated bundle. Nothing is written: saving it is the caller's job (`tic build app.bundle.json > src/di/app.bundle.ts`). */
  content: string;
  /**
   * Non-fatal problems found while building, e.g. a `paths.exclude` that drops a default
   * test glob or two selected classes passing the same decorator token.
   */
  warnings: string[];
}

export interface IBundleService {
  /**
   * Generates the bundle a resolved config describes and returns it; nothing is written.
   *
   * @throws {TicConfigError} when the tsconfig is missing or invalid, or no tsconfig paths alias covers a selected class's file.
   * @throws {NamespaceNotFoundError} when a path is neither a folder nor a tsconfig paths alias of one.
   */
  bundle(config: BundleConfig): Bundle;
}

export const IBundleServiceKey = new SingleToken<IBundleService>('IBundleService');

@register(IBundleServiceKey)
export class BundleService implements IBundleService {
  constructor(
    @inject(by(IFileSystemServiceKey)) private readonly fs: IFileSystemService,
    @inject(by(IBundleViewKey)) private readonly view: IBundleView,
  ) {}

  /**
   * @throws {TicConfigError} when the tsconfig is missing or invalid, or no tsconfig paths alias covers a selected class's file.
   * @throws {NamespaceNotFoundError} when a path is neither a folder nor a tsconfig paths alias of one.
   */
  bundle(config: BundleConfig): Bundle {
    const paths = loadImportPaths(config.tsconfig, config.importExtension);
    const relative = (file: string) => toPosix(path.relative(config.dir, file));
    const exclude = config.paths.exclude.flatMap((glob) => paths.resolveGlob(glob, config.dir)).map(globToRegExp);
    // Decided by path alone, before a file is read: this is what keeps unrelated files unparsed.
    const isExcluded = (file: string) => {
      const filename = relative(file);
      return exclude.some((glob) => glob.test(filename));
    };

    const files = new Set<string>();
    for (const folder of config.paths.include) {
      const dir = paths.resolveNamespace(folder, config.dir);
      for (const file of listSourceFiles(dir, isExcluded)) files.add(file);
    }

    const classes = [...files]
      .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
      .flatMap((file) => {
        const text = this.fs.readFile(file);
        // Another config's bundle can sit in a scanned folder; it is output, never input.
        return text.startsWith(GENERATED_HEADER) ? [] : findClasses(file, config.match, text);
      })
      .map((cls) => ({ ...cls, specifier: paths.specifier(cls.file) }));
    const uncovered = [...new Set(classes.filter((cls) => cls.specifier === undefined).map((cls) => cls.file))];
    if (uncovered.length > 0) {
      throw new TicConfigError(
        `no tsconfig paths alias covers ${uncovered.map((file) => toPosix(path.relative(config.dir, file))).join(', ')}; ` +
          `the bundle goes to stdout, so every import is written through an alias — add a "paths" entry to ${toPosix(path.relative(config.dir, config.tsconfig.file))}`,
      );
    }

    const content = this.view.render({
      name: config.bundleClassName,
      paths: config.paths.include,
      classes: classes.map((cls) => ({ ...cls, specifier: cls.specifier! })),
    });
    return {
      bundle: config.bundleClassName,
      registrations: classes.length,
      files: [...new Set(classes.map((cls) => cls.file))],
      content,
      warnings: [...config.warnings, ...tokenCollisions(classes)],
    };
  }
}
