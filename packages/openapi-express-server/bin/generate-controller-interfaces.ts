import { openapiToServer } from '@ibabkin/openapi-framework';

openapiToServer({
  inputFile: './swagger.yaml',
  outputFile: './controller-interfaces.d.ts',
});
