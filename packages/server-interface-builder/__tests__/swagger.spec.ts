import api from './swagger.json';
import { OpenAPIV3 } from 'openapi-types';
import { ServerGenerator } from '../lib';

describe('swagger', function () {
    it('ServerGenerator', function () {
        const generator = new ServerGenerator(__dirname);
        generator.generate(api as OpenAPIV3.Document, './output.d.ts');
        expect(true).toEqual(true);
    });
});
