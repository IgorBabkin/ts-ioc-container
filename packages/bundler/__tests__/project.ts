import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

/** A throwaway project on disk: `files` maps paths relative to its root to their contents. */
export class TempProject {
  static create(files: Record<string, string | object>): TempProject {
    const project = new TempProject(mkdtempSync(path.join(tmpdir(), 'tic-')));
    for (const [file, content] of Object.entries(files)) project.write(file, content);
    return project;
  }

  private constructor(readonly root: string) {}

  path(file: string): string {
    return path.join(this.root, file);
  }

  write(file: string, content: string | object): void {
    mkdirSync(path.dirname(this.path(file)), { recursive: true });
    writeFileSync(this.path(file), typeof content === 'string' ? content : JSON.stringify(content, null, 2));
  }

  /**
   * Installs this bundler package into the project's node_modules as a symlink, so predicate files
   * can `require('@ts-ioc-container/bundler')` as a consumer's would. Needs the package's `cjm` build.
   */
  read(file: string): string {
    return readFileSync(this.path(file), 'utf8');
  }

  dispose(): void {
    rmSync(this.root, { recursive: true, force: true });
  }
}

export const decorated = (name: string, decorator = 'register') =>
  `import { ${decorator} } from 'ts-ioc-container';\n\n@${decorator}()\nexport class ${name} {}\n`;
