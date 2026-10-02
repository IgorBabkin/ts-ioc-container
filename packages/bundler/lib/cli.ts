import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { build, type OutputStatus, TSCONFIG_FILE } from './build';
import { findConfigFiles, findPackageRoot } from './config';
import { TicConfigError, TicError } from './errors';

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
  '  ts-ioc-container build [--config <path>]... [--check]   generate one bundle per *.bundle.{json,yaml,yml} config',
  '                                                          (none: one bundle from tsconfig.json, all defaults)',
  '',
  'Options:',
  '  -c, --config <path>   build only this config; repeatable (default: every *.bundle.{json,yaml,yml} of the package, else tsconfig.json)',
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
  const options: { configs: string[]; check: boolean } = { configs: [], check: false };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--check') options.check = true;
    else if (arg === '--config' || arg === '-c') {
      const config = args[++i];
      if (!config) throw new UsageError(`${arg} needs a path`);
      options.configs.push(config);
    } else if (arg.startsWith('--config=')) options.configs.push(arg.slice('--config='.length));
    else throw new UsageError(`unknown option "${arg}"`);
  }
  return options;
}

/**
 * The configs to build: the ones named (relative to `cwd`), else every `*.bundle.json` at the
 * root of the package `cwd` is in, else `undefined` — one build from that package's
 * `tsconfig.json` with default settings. Never looks past the package into a workspace root.
 *
 * @throws {TicConfigError} when none is named and the package has neither a `*.bundle.json` nor a `tsconfig.json`.
 */
function configsToBuild(named: string[], cwd: string): (string | undefined)[] {
  if (named.length > 0) return named.map((config) => path.resolve(cwd, config));
  const root = findPackageRoot(cwd);
  const found = findConfigFiles(root);
  if (found.length > 0) return found;
  if (existsSync(path.join(root, TSCONFIG_FILE))) return [undefined];
  throw new TicConfigError(`no *.bundle.{json,yaml,yml} or ${TSCONFIG_FILE} in ${root}; name a config with --config`);
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
    const { configs, check } = parseBuildArgs(rest);
    let stale = 0;
    for (const config of configsToBuild(configs, io.cwd)) {
      const name = config === undefined ? TSCONFIG_FILE : path.relative(io.cwd, config);
      try {
        const { output, warnings } = build({ config, check, cwd: io.cwd });
        for (const warning of warnings) io.stderr(`tic: warning: ${name}: ${warning}`);
        const { status, file, registrations } = output;
        io.stdout(`${VERB[status].padEnd(10)}${path.relative(io.cwd, file)} (${plural(registrations)})`);
        if (status === 'stale') stale++;
      } catch (e) {
        if (e instanceof TicError) e.message = `${name}: ${e.message}`;
        throw e;
      }
    }
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
