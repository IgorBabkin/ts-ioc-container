#!/usr/bin/env node

import * as process from 'process';
import args from 'args';
import * as fs from 'fs';
import { renderServer } from './index';
import { OpenAPIV3 } from 'openapi-types';
import yaml from 'js-yaml';

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

const openapi: OpenAPIV3.Document = yaml.load(fs.readFileSync(inputFile, { encoding: 'utf-8' })) as any;
console.log(JSON.stringify(openapi, null, 2));
fs.writeFileSync(outputFile, renderServer(openapi), { encoding: 'utf-8' });

process.exit(0);
