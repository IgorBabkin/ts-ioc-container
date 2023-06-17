#!/usr/bin/env node

import * as process from 'process';
import args from 'args';
import { renderServer } from './index';
import { OpenAPIV3 } from 'openapi-types';
import { loadJSON } from './utils/json';
import { isYAML, loadYAML } from './utils/yaml';
import { getFilenameWithoutPath, getPathToFileWithoutFileName, saveFile } from './utils/file';
import * as path from 'path';

function parseArguments(props: string[]) {
    args.option('input', 'openapi file path')
        .option('output', 'output file path')
        .option('emitJSON', 'generate JSON file');

    const flags = args.parse(props);

    const inputFile: string | undefined = flags.input;
    if (!inputFile) {
        throw new Error('openapi file path is required');
    }

    const outputFile: string | undefined = flags.output;
    if (!outputFile) {
        throw new Error('output file path is required');
    }

    const emitJSON = !!flags.emitJSON;

    return { inputFile, outputFile, emitJSON };
}

function main(props: string[]) {
    const { inputFile, outputFile, emitJSON } = parseArguments(props);
    const content: OpenAPIV3.Document = isYAML(inputFile) ? loadYAML(inputFile) : loadJSON(inputFile);
    if (emitJSON && isYAML(inputFile)) {
        const inputFilename: string = getFilenameWithoutPath(inputFile);
        const outputPath: string = getPathToFileWithoutFileName(outputFile);
        saveFile(path.resolve(outputPath, inputFilename.replace(/\.yaml$/, '.json')), JSON.stringify(content, null, 2));
    }
    saveFile(outputFile, renderServer(content));
}

main(process.argv);
process.exit(0);
