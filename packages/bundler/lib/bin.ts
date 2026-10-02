#!/usr/bin/env node
import { run } from './app';

process.exitCode = run(process.argv.slice(2));
