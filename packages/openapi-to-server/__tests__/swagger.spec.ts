import { OpenAPIV3 } from 'openapi-types';
import { renderHttpClient, renderServer } from '../lib';
import fs from 'fs';
import yaml from 'js-yaml';
import * as path from 'path';

describe('swagger', function () {
    it('Server', function () {
        const api: OpenAPIV3.Document = yaml.load(
            fs.readFileSync(path.resolve(__dirname, './swagger.yaml'), { encoding: 'utf-8' }),
        ) as any;
        fs.writeFileSync('.generated/output.d.ts', renderServer(api));
        expect(true).toEqual(true);
    });

    it('Client', function () {
        const api: OpenAPIV3.Document = yaml.load(
            fs.readFileSync(path.resolve(__dirname, './swagger.yaml'), { encoding: 'utf-8' }),
        ) as any;
        fs.writeFileSync('.generated/client.ts', renderHttpClient(api));
        expect(true).toEqual(true);
    });
});
