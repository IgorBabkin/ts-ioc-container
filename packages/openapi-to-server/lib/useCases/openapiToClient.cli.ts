#!/usr/bin/env node

import * as process from 'process';
import args from 'args';
import { openapiToClient } from './openapiToClient';
import path from 'path';

args.option('input', 'openapi file path').option('output', 'output file path');

const flags = args.parse(process.argv);

const inputFile = flags.input;
if (!inputFile) {
  throw new Error('openapi file path is required');
}

const outputFile = flags.output;
if (!flags.output) {
  throw new Error('output file path is required');
}

openapiToClient({ inputFile, outputFile });
process.exit(0);
