import { OpenAPIV3 } from 'openapi-types';
import { isYAML, loadYAML } from '../utils/yaml';
import { loadJSON } from '../utils/json';
import { renderHttpClient } from '../index';
import fs from 'fs';

type Props = { inputFile: string; outputFile: string };

export function openapiToClient({ inputFile, outputFile }: Props) {
    const content: OpenAPIV3.Document = isYAML(inputFile) ? loadYAML(inputFile) : loadJSON(inputFile);
    fs.writeFileSync(outputFile, renderHttpClient(content));
}
