import { readFileSync } from 'node:fs';
import { SingleToken } from 'ts-ioc-container';

/** Where the CLI runs and writes: `run(argv, io)` takes one, so tests can capture output. */
export interface CliIo {
  cwd: string;
  stdout: (line: string) => void;
  stderr: (line: string) => void;
  /** Reads all of standard input: what `--json -` / `--yaml -` take. Absent: there is no stdin to read. */
  stdin?: () => string;
}

export const CliIoKey = new SingleToken<CliIo>('CliIo');

export const processIo = (): CliIo => ({
  cwd: process.cwd(),
  stdout: console.log,
  stderr: console.error,
  stdin: () => readFileSync(0, 'utf8'),
});
