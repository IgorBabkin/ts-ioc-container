import api from './swagger.json';
import { OpenAPIV3 } from 'openapi-types';
import { renderDocument } from '../lib';
import * as fs from 'fs';

describe('swagger', function () {
    it('Generator', function () {
        fs.writeFileSync('.generated/output.ts', renderDocument(api as OpenAPIV3.Document));
        expect(true).toEqual(true);
    });
});
