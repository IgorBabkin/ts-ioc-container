import { type IContainer, type IContainerModule, Registration as R } from 'ts-ioc-container';
import { type CliIo, CliIoKey } from '../domain/CliIo';
import { GlobalConfigKey } from '../domain/GlobalConfig';
import { ExceptionHandler } from '../exceptions/ExceptionHandler';
import { ConsoleLogger } from '../services/ConsoleLogger';
import { HandlebarsRenderService } from '../services/HandlebarsRenderService';
import { NodeFileSystemService } from '../services/NodeFileSystemService';
import { StdOutputService } from '../services/OutputService';

/** Services every feature shares: the run's context, its output streams, and error reporting. */
export class CommonModule implements IContainerModule {
  constructor(private readonly io: CliIo) {}

  applyTo(container: IContainer): void {
    container
      .addRegistration(R.fromValue(this.io).bindTo(CliIoKey))
      .addRegistration(R.fromValue({ cwd: this.io.cwd }).bindTo(GlobalConfigKey))
      .addRegistration(R.fromClass(StdOutputService))
      .addRegistration(R.fromClass(ConsoleLogger))
      .addRegistration(R.fromClass(ExceptionHandler))
      .addRegistration(R.fromClass(NodeFileSystemService))
      .addRegistration(R.fromClass(HandlebarsRenderService));
  }
}
