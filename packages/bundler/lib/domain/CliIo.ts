import { SingleToken } from 'ts-ioc-container';

/** Where the CLI runs and writes: `run(argv, io)` takes one, so tests can capture output. */
export interface CliIo {
  cwd: string;
  stdout: (line: string) => void;
  stderr: (line: string) => void;
}

export const CliIoKey = new SingleToken<CliIo>('CliIo');

export const processIo = (): CliIo => ({ cwd: process.cwd(), stdout: console.log, stderr: console.error });
