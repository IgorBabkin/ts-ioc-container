import api from './swagger.json';
import { OpenAPIV3 } from 'openapi-types';
import { renderHttpClient, renderServer } from '../lib';
import fs from 'fs';

describe('swagger', function () {
    it('Server', function () {
        fs.writeFileSync('.generated/output.d.ts', renderServer(api as OpenAPIV3.Document));
        expect(true).toEqual(true);
    });

    it('Client', function () {
        fs.writeFileSync('.generated/client.ts', renderHttpClient(api as OpenAPIV3.Document));
        expect(true).toEqual(true);
    });
});
