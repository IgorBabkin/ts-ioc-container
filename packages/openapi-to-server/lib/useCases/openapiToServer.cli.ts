#!/usr/bin/env node

import * as process from 'process';
import args from 'args';
import { openapiToServer } from './openapiToServer';

args.option('input', 'openapi file path').option('output', 'output file path').option('json', 'generate JSON file');

const flags = args.parse(process.argv);

const inputFile: string | undefined = flags.input;
if (!inputFile) {
  throw new Error('openapi file path is required');
}

const outputFile: string | undefined = flags.output;
if (!outputFile) {
  throw new Error('output file path is required');
}

const emitJSON = !!flags['json'];

openapiToServer({ inputFile, outputFile, emitJSON });
process.exit(0);
