import api from './swagger.json';
import { OpenAPIV3 } from 'openapi-types';
import { renderDocument } from '../lib';
import fs from 'fs';
import path from 'path';

describe('swagger', function () {
    it('ServerGenerator', function () {
        fs.writeFileSync(path.resolve(__dirname, './output.d.ts'), renderDocument(api as OpenAPIV3.Document));
        expect(true).toEqual(true);
    });
});
