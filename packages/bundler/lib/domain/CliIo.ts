import { readFileSync } from 'node:fs';
import { SingleToken } from 'ts-ioc-container';

/** Where the CLI runs and writes: `run(argv, io)` takes one, so tests can capture output. */
export interface CliIo {
  cwd: string;
  stdout: (line: string) => void;
  stderr: (line: string) => void;
  /** All of standard input, or `undefined` when nothing is piped in (a terminal, or no stdin at all). */
  stdin?: () => string | undefined;
}

export const CliIoKey = new SingleToken<CliIo>('CliIo');

export const processIo = (): CliIo => ({
  cwd: process.cwd(),
  stdout: console.log,
  stderr: console.error,
  stdin: () => (process.stdin.isTTY ? undefined : readFileSync(0, 'utf8')),
});
