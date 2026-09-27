#!/usr/bin/env node
import { run } from './cli';

process.exitCode = run(process.argv.slice(2));
