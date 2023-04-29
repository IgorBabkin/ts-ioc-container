import { OpenAPIV3 } from 'openapi-types';

export class SchemaObjectBuilder {
    static fromParameters(parameters: OpenAPIV3.ParameterObject[]): SchemaObjectBuilder {
        const builder = new SchemaObjectBuilder();
        for (const p of parameters) {
            builder.addProperty(p);
        }
        return builder;
    }

    private required: string[] = [];
    private properties: { [key: string]: OpenAPIV3.SchemaObject } = {};

    addProperty(schema: OpenAPIV3.ParameterObject): void {
        if (schema.required !== false) {
            this.required.push(schema.name);
        }
        this.properties[schema.name] = schema.schema as OpenAPIV3.SchemaObject;
    }

    build(): OpenAPIV3.NonArraySchemaObject {
        return {
            type: 'object',
            required: this.required,
            properties: this.properties,
        };
    }
}
