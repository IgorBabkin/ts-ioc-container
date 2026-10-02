import { by, inject, register, SingleToken } from 'ts-ioc-container';
import { type CliIo, CliIoKey } from '../domain/CliIo';

/** A command's result, one line at a time: what a caller of `tic` reads from stdout. */
export interface IOutputService {
  write(line: string): void;
}

export const IOutputServiceKey = new SingleToken<IOutputService>('IOutputService');

@register(IOutputServiceKey)
export class StdOutputService implements IOutputService {
  constructor(@inject(by(CliIoKey)) private readonly io: CliIo) {}

  write(line: string): void {
    this.io.stdout(line);
  }
}
