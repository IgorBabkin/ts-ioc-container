import { OpenAPIV3 } from 'openapi-types';
import { renderDocument } from './templates';
import fs from 'fs';
import path from 'path';

export class Generator {
    constructor(private dirname: string) {}

    generate(doc: OpenAPIV3.Document, filename: string) {
        const content = renderDocument(doc);
        fs.writeFileSync(path.resolve(this.dirname, filename), content);
    }
}
