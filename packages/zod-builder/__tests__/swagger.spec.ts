import api from './swagger.json';
import { OpenAPIV3 } from 'openapi-types';
import { Generator } from '../lib';

describe('swagger', function () {
    it('Generator', function () {
        const generator = new Generator(__dirname);
        generator.generate(api as OpenAPIV3.Document, './output.ts');
        expect(true).toEqual(true);
    });
});
