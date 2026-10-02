import { parseCliFlags } from '../utils/cli.js';
import { openapiToZod } from '../useCases/openapiToZod.js';

const flags = parseCliFlags(process.argv.slice(2));
openapiToZod({ inputFile: flags.input, outputFile: flags.output });
