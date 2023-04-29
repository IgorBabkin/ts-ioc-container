import Handlebars from 'handlebars';
import { StringBuilder } from './StringBuilder';
import { OpenAPIV3 } from 'openapi-types';
import path from 'path';
import fs from 'fs';
import { ContentBuilder } from './ContentBuilder';

const template = Handlebars.compile<{ name: string; schema: OpenAPIV3.ReferenceObject | OpenAPIV3.SchemaObject }>(
    fs.readFileSync(path.resolve(__dirname, './JsonSchemaTypeTemplate.hbs'), 'utf8'),
);

export class SchemaBuilder implements StringBuilder {
    private contentBuilder: ContentBuilder = new ContentBuilder();
    append(name: string, schema: OpenAPIV3.ReferenceObject | OpenAPIV3.SchemaObject): this {
        this.contentBuilder.append(template({ name, schema }));
        return this;
    }

    build(): string {
        return this.contentBuilder.build();
    }
}
