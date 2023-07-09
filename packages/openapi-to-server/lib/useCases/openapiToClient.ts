import { OpenAPIV3 } from 'openapi-types';
import { isYAML, loadYAML } from '../utils/yaml';
import { loadJSON } from '../utils/json';
import fs from 'fs';
import { renderClient } from '../templates';

type Props = { inputFile: string; outputFile: string };

export function openapiToClient({ inputFile, outputFile }: Props) {
  const content: OpenAPIV3.Document = isYAML(inputFile) ? loadYAML(inputFile) : loadJSON(inputFile);
  fs.writeFileSync(outputFile, renderClient(content));
}
