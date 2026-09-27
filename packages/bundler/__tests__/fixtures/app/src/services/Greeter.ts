import { by, inject, register } from 'ts-ioc-container';
import { type ILogger, ILoggerToken } from '@app/infra/logging/ILogger';
import { Formatter } from './Formatter';

@register()
export class Greeter {
  private readonly formatter = new Formatter();

  constructor(@inject(by(ILoggerToken)) private readonly logger: ILogger) {}

  greet(name: string): void {
    this.logger.log(this.formatter.format(name));
  }
}
