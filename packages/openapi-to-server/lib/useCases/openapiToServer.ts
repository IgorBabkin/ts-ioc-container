import fs from 'fs';
import path from 'path';
import { loadDocument } from '../utils/document.js';
import { isYAML } from '../utils/yaml.js';
import { saveJSON } from '../utils/json.js';
import { renderComponents, renderServer } from '../render.js';

export type OpenapiToServerOptions = {
  inputFile: string;
  outputFile: string;
  /** Also write the parsed document as JSON next to `outputFile` (only when the input is YAML). */
  emitJSON?: boolean;
};

export function openapiToServer({ inputFile, outputFile, emitJSON }: OpenapiToServerOptions): void {
  const doc = loadDocument(inputFile);
  fs.mkdirSync(path.dirname(outputFile), { recursive: true });

  if (emitJSON && isYAML(inputFile)) {
    const jsonName = path.basename(inputFile).replace(/\.ya?ml$/, '.json');
    saveJSON(path.join(path.dirname(outputFile), jsonName), doc);
  }

  fs.writeFileSync(outputFile, [renderComponents(doc), renderServer(doc)].join(''), 'utf8');
}
