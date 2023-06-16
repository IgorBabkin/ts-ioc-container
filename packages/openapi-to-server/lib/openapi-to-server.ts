#!/usr/bin/env node

import * as process from 'process';
import args from 'args';
import * as fs from 'fs';
import { renderServer } from './index';
import { OpenAPIV3 } from 'openapi-types';
import yaml from 'js-yaml';
import * as console from 'console';

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

const data: string = fs.readFileSync(inputFile, { encoding: 'utf-8' });
const content: OpenAPIV3.Document = inputFile.search(/\.json$/) > 0 ? JSON.parse(data) : (yaml.load(data) as any);
console.log(content);
fs.writeFileSync(outputFile, renderServer(content), { encoding: 'utf-8' });

process.exit(0);
