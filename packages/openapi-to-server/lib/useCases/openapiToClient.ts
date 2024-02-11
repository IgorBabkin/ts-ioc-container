import { OpenAPIV3 } from 'openapi-types';
import { isYAML, loadYAML } from '../utils/yaml';
import { loadJSON } from '../utils/json';
import fs from 'fs';
import { renderClient } from '../templates';
import path from 'path';

type Props = { inputFile: string; outputDir: string };
const TEMPLATE_DIR = path.resolve(__dirname, '../templates');
const utilsSource = path.resolve(TEMPLATE_DIR, 'utils.template.ts');

export function openapiToClient({ inputFile, outputDir }: Props) {
  fs.copyFileSync(utilsSource, path.resolve(outputDir, 'utils.ts'));

  const content: OpenAPIV3.Document = isYAML(inputFile) ? loadYAML(inputFile) : loadJSON(inputFile);
  fs.writeFileSync(path.resolve(outputDir, 'client.ts'), renderClient(content));
}
