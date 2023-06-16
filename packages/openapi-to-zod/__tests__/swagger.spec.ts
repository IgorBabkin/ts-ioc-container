import { OpenAPIV3 } from 'openapi-types';
import { renderDocument } from '../lib';
import * as fs from 'fs';
import yaml from 'js-yaml';
import path from 'path';

describe('swagger', function () {
    it('Generator', function () {
        const api: OpenAPIV3.Document = yaml.load(
            fs.readFileSync(path.resolve(__dirname, './swagger.yaml'), { encoding: 'utf-8' }),
        ) as any;
        fs.writeFileSync('.generated/output.ts', renderDocument(api));
        expect(true).toEqual(true);
    });
});
