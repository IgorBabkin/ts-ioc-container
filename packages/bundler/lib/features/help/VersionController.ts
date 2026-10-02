import { readFileSync } from 'node:fs';
import path from 'node:path';
import { by, inject, invoke, register } from 'ts-ioc-container';
import { onDefault } from '../../cli';
import { type IOutputService, IOutputServiceKey } from '../../services/OutputService';

const PACKAGE_JSON = path.resolve(__dirname, '../../../package.json');

/** `tic version`, also `tic --version` / `tic -v`. */
@register('version')
export class VersionController {
  constructor(@inject(by(IOutputServiceKey)) private readonly output: IOutputService) {}

  @onDefault(invoke)
  printVersion(): void {
    this.output.write(JSON.parse(readFileSync(PACKAGE_JSON, 'utf8')).version);
  }
}
