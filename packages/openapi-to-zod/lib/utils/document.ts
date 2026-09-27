import { OpenAPIV3 } from 'openapi-types';
import { isYAML, loadYAML } from './yaml.js';
import { loadJSON } from './json.js';

export function loadDocument(inputFile: string): OpenAPIV3.Document {
  return isYAML(inputFile) ? loadYAML<OpenAPIV3.Document>(inputFile) : loadJSON<OpenAPIV3.Document>(inputFile);
}
