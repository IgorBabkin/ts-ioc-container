import { parseCliFlags } from '../utils/cli.js';
import { openapiToServer } from '../useCases/openapiToServer.js';

const flags = parseCliFlags(process.argv.slice(2));
openapiToServer({ inputFile: flags.input, outputFile: flags.output, emitJSON: flags.json });
