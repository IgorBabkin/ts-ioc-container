import api from './swagger.json';
import { OpenAPIV3 } from 'openapi-types';
import { renderDocument } from '../lib';
import * as fs from 'fs';
import * as path from 'path';

describe('swagger', function () {
    it('Generator', function () {
        fs.writeFileSync(path.resolve(__dirname, './output.ts'), renderDocument(api as OpenAPIV3.Document));
        expect(true).toEqual(true);
    });
});
