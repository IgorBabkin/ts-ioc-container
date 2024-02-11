import { openapiToClient, openapiToServer } from '../lib';
import fs from 'fs';
import * as path from 'path';

const inputFile = path.resolve(__dirname, './swagger.yaml');
const serverOutputFile = path.resolve(__dirname, '../.generated/server.d.ts');
const clientOutputDir = path.resolve(__dirname, '../.generated');

describe('swagger', function () {
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
      outputDir: clientOutputDir,
    });
    expect(fs.readFileSync(path.resolve(clientOutputDir, 'client.ts'))).toMatchSnapshot();
  });
});
