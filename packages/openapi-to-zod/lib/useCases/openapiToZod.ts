import fs from 'fs';
import path from 'path';
import { loadDocument } from '../utils/document.js';
import { renderValidators } from '../render.js';

export type OpenapiToZodOptions = {
  inputFile: string;
  outputFile: string;
};

export function openapiToZod({ inputFile, outputFile }: OpenapiToZodOptions): void {
  const doc = loadDocument(inputFile);
  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  fs.writeFileSync(outputFile, renderValidators(doc), 'utf8');
}
