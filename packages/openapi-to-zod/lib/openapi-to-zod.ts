#!/usr/bin/env node

import * as process from 'process';
import args from 'args';
import { renderDocument } from './index';
import { OpenAPIV3 } from 'openapi-types';
import { isYAML, loadYAML } from './utils/yaml';
import { loadJSON } from './utils/json';
import { saveFile } from './utils/file';

function parseArguments(props: string[]) {
    args.option('input', 'openapi file path').option('output', 'output file path');

    const flags = args.parse(props);

    const inputFile = flags.input;
    if (!inputFile) {
        throw new Error('openapi file path is required');
    }

    const outputFile = flags.output;
    if (!flags.output) {
        throw new Error('output file path is required');
    }

    return { inputFile, outputFile };
}

function main(props: string[]) {
    const { inputFile, outputFile } = parseArguments(props);
    const content: OpenAPIV3.Document = isYAML(inputFile) ? loadYAML(inputFile) : loadJSON(inputFile);
    saveFile(outputFile, renderDocument(content));
}

main(process.argv);
process.exit(0);
