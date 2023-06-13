#!/usr/bin/env node

import * as process from 'process';
import args from 'args';
import * as fs from 'fs';
import { renderDocument } from './index';

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

const openapi = JSON.parse(fs.readFileSync(inputFile, { encoding: 'utf-8' }));
fs.writeFileSync(outputFile, renderDocument(openapi), { encoding: 'utf-8' });

process.exit(0);
