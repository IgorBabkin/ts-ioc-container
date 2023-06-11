import api from './swagger.json';
import { OpenAPIV3 } from 'openapi-types';
import { Generator } from '../lib';

describe('swagger', function () {
    it('ServerGenerator', function () {
        const generator = new Generator(__dirname);
        generator.generate(api as OpenAPIV3.Document, './output.d.ts');
        expect(true).toEqual(true);
    });
});
