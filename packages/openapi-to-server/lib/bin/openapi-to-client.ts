#!/usr/bin/env node
import { parseCliFlags } from '../utils/cli.js';
import { openapiToClient } from '../useCases/openapiToClient.js';

const flags = parseCliFlags(process.argv.slice(2));
openapiToClient({ inputFile: flags.input, outputFile: flags.output });
