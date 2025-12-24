import { openapiToServer } from '@ibabkin/openapi-framework';
import { renderValidators } from '@ibabkin/openapi-to-request-validator';
import { OpenAPIV3 } from 'openapi-types';
import * as yaml from 'js-yaml';
import path from 'path';
import fs from 'fs';

openapiToServer({
  inputFile: path.resolve(__dirname, './swagger.yaml'),
  outputFile: path.resolve(__dirname, './controller-interfaces.ts'),
});

const content = fs.readFileSync(path.resolve(__dirname, './swagger.yaml'), 'utf8');
const doc = yaml.load(content) as OpenAPIV3.Document;
const validators = renderValidators(doc);
fs.writeFileSync(path.resolve(__dirname, './validators.ts'), validators);
