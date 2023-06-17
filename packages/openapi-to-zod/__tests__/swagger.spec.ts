import { openapiToZod } from '../lib';
import * as path from 'path';
import fs from 'fs';

describe('swagger', function () {
    const inputFile = path.resolve(__dirname, 'swagger.yaml');
    const outputFile = path.resolve(__dirname, '../.generated/validators.ts');

    it('openapiToZod', function () {
        openapiToZod({
            inputFile: inputFile,
            outputFile: outputFile,
        });

        expect(fs.readFileSync(outputFile)).toMatchSnapshot();
    });
});
