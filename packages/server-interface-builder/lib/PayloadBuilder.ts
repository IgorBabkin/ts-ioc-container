import { StringBuilder } from './StringBuilder';
import { OpenAPIV3 } from 'openapi-types';
import { SchemaBuilder } from './SchemaBuilder';
import { isReferenceObject } from './utils';

export class PayloadBuilder implements StringBuilder {
    private query?: OpenAPIV3.SchemaObject;
    private schemaBuilder: SchemaBuilder = new SchemaBuilder();
    private body?: OpenAPIV3.ReferenceObject | OpenAPIV3.SchemaObject;

    constructor(private name: string) {}

    build(): string {
        return this.schemaBuilder
            .append(this.name, {
                type: 'object',
                properties: {
                    ...(this.query ? { query: this.query } : {}),
                    ...(this.body ? { body: this.body } : {}),
                },
                required: ['query', 'body'],
            })
            .build();
    }

    appendQuery(schema: OpenAPIV3.NonArraySchemaObject): void {
        this.query = schema;
    }

    appendBody(requestBody: OpenAPIV3.ReferenceObject | OpenAPIV3.RequestBodyObject) {
        if (isReferenceObject(requestBody)) {
            this.body = requestBody;
        } else {
            if (requestBody.content?.['application/json']) {
                this.body = requestBody.content['application/json'].schema;
            }
        }
    }
}
