import { openapiToServer } from '@ibabkin/openapi-framework';
import { openapiToZod } from '@ibabkin/openapi-framework/validation';
import path from 'path';

openapiToServer({
  inputFile: path.resolve(__dirname, './swagger.yaml'),
  outputFile: path.resolve(__dirname, './controller-interfaces.ts'),
});

openapiToZod({
  inputFile: path.resolve(__dirname, './swagger.yaml'),
  outputFile: path.resolve(__dirname, './validators.ts'),
});
