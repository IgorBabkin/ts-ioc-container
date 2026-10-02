import { readFileSync } from 'node:fs';
import path from 'node:path';
import { build, type OutputStatus } from './build';
import { TicError } from './errors';

export interface CliIo {
  cwd: string;
  stdout: (line: string) => void;
  stderr: (line: string) => void;
}

const USAGE = [
  'Usage: ts-ioc-container <command> [options]',
  '       tic is a shortcut for ts-ioc-container',
  '',
  'Commands:',
  '  ts-ioc-container build [--config <path>] [--check]   generate the bundles described by .bundles.json',
  '',
  'Options:',
  '  -c, --config <path>   config file (default: .bundles.json)',
  '  --check               write nothing; exit 1 when a generated bundle is out of date',
  '  -h, --help            show this help',
  '  -v, --version         show the version',
].join('\n');

const VERB: Record<OutputStatus, string> = { written: 'wrote', unchanged: 'unchanged', stale: 'stale' };

const plural = (n: number) => `${n} registration${n === 1 ? '' : 's'}`;

function version(): string {
  return JSON.parse(readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8')).version;
}

class UsageError extends TicError {}

/**
 * @throws {UsageError} when an option is unknown or `--config` has no value.
 */
function parseBuildArgs(args: string[]) {
  const options: { config?: string; check: boolean } = { check: false };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--check') options.check = true;
    else if (arg === '--config' || arg === '-c') {
      options.config = args[++i];
      if (!options.config) throw new UsageError(`${arg} needs a path`);
    } else if (arg.startsWith('--config=')) options.config = arg.slice('--config='.length);
    else throw new UsageError(`unknown option "${arg}"`);
  }
  return options;
}

/** Runs the `tic` CLI and returns its exit code; output goes through `io`. */
export function run(
  argv: string[],
  io: CliIo = { cwd: process.cwd(), stdout: console.log, stderr: console.error },
): number {
  const [command, ...rest] = argv;
  if (command === '--help' || command === '-h' || command === 'help') {
    io.stdout(USAGE);
    return 0;
  }
  if (command === '--version' || command === '-v') {
    io.stdout(version());
    return 0;
  }
  try {
    if (command !== 'build') {
      io.stderr(command ? `tic: unknown command "${command}"` : USAGE);
      return 1;
    }
    const { config, check } = parseBuildArgs(rest);
    const { outputs, warnings } = build({ config, check, cwd: io.cwd });
    for (const warning of warnings) io.stderr(`tic: warning: ${warning}`);
    for (const { status, file, registrations } of outputs) {
      io.stdout(`${VERB[status].padEnd(10)}${path.relative(io.cwd, file)} (${plural(registrations)})`);
    }
    const stale = outputs.filter((o) => o.status === 'stale').length;
    if (stale > 0) {
      io.stderr(`tic: ${stale} generated bundle${stale === 1 ? ' is' : 's are'} out of date — run \`tic build\``);
      return 1;
    }
    return 0;
  } catch (e) {
    if (!(e instanceof TicError)) throw e;
    io.stderr(`tic: ${e.message}`);
    return 1;
  }
}
