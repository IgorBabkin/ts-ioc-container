import fs from 'fs';
import path from 'path';
import { loadDocument } from '../utils/document.js';
import { renderClient } from '../render.js';

export type OpenapiToClientOptions = {
  inputFile: string;
  outputFile: string;
};

export function openapiToClient({ inputFile, outputFile }: OpenapiToClientOptions): void {
  const doc = loadDocument(inputFile);
  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  fs.writeFileSync(outputFile, renderClient(doc), 'utf8');
}
