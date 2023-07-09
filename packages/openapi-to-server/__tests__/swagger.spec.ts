import { openapiToClient, openapiToServer } from '../lib';
import fs from 'fs';
import * as path from 'path';

describe('swagger', function () {
  const inputFile = path.resolve(__dirname, './swagger.yaml');
  const serverOutputFile = path.resolve(__dirname, '../.generated/server.d.ts');
  const clientOutputFile = path.resolve(__dirname, '../.generated/client.ts');

  it('Server', function () {
    openapiToServer({
      inputFile: inputFile,
      outputFile: serverOutputFile,
      emitJSON: true,
    });
    expect(fs.readFileSync(serverOutputFile)).toMatchSnapshot();
  });

  it('Client', function () {
    openapiToClient({
      inputFile: inputFile,
      outputFile: clientOutputFile,
    });
    expect(fs.readFileSync(clientOutputFile)).toMatchSnapshot();
  });
});
