import { by, inject, invoke, register } from 'ts-ioc-container';
import { onDefault, USAGE } from '../../cli';
import { type IOutputService, IOutputServiceKey } from '../../services/OutputService';

/** `tic help`, also `tic --help` / `tic -h`. */
@register('help')
export class HelpController {
  constructor(@inject(by(IOutputServiceKey)) private readonly output: IOutputService) {}

  @onDefault(invoke)
  printUsage(): void {
    this.output.write(USAGE);
  }
}
