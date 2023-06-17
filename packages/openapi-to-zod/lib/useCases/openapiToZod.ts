import { OpenAPIV3 } from 'openapi-types';
import { isYAML, loadYAML } from '../utils/yaml';
import { loadJSON } from '../utils/json';
import { saveFile } from '../utils/file';
import { renderDocument } from '../index';

type Props = { inputFile: string; outputFile: string };

export function openapiToZod({ inputFile, outputFile }: Props) {
    const content: OpenAPIV3.Document = isYAML(inputFile) ? loadYAML(inputFile) : loadJSON(inputFile);
    saveFile(outputFile, renderDocument(content));
}
