import { StringBuilder } from './StringBuilder';
import { OpenAPIV3 } from 'openapi-types';
import { SchemaObjectBuilder } from './SchemaObjectBuilder';
import { SchemaBuilder } from './SchemaBuilder';
import { NameFactory } from './NameFactory';
import { PayloadBuilder } from './PayloadBuilder';
import { isQueryParameter, isReferenceObject } from './utils';
import { BuilderComposer } from './BuilderComposer';

export class RequestBuilder implements StringBuilder {
    private builderComposer = new BuilderComposer();
    private payloadBuilder: PayloadBuilder;
    private responseBuilder = new SchemaBuilder();
    constructor(private nameFactory: NameFactory) {
        this.payloadBuilder = new PayloadBuilder(nameFactory.createPayloadName());
        this.builderComposer.append(this.payloadBuilder);
        this.builderComposer.append(this.responseBuilder);
    }

    appendQuery(parameters: (OpenAPIV3.ReferenceObject | OpenAPIV3.ParameterObject)[]): void {
        const jsonSchema = SchemaObjectBuilder.fromParameters(parameters.filter(isQueryParameter)).build();
        this.payloadBuilder.appendQuery(jsonSchema);
    }

    build(): string {
        return this.builderComposer.build();
    }

    appendBody(requestBody: OpenAPIV3.ReferenceObject | OpenAPIV3.RequestBodyObject): void {
        this.payloadBuilder.appendBody(requestBody);
    }

    appendResponses(responses: OpenAPIV3.ResponsesObject) {
        if (responses['200']) {
            const response = responses['200'];
            if (!isReferenceObject(response)) {
                const content = response.content?.['application/json'];
                if (content?.schema && !isReferenceObject(content.schema)) {
                    this.responseBuilder.append(this.nameFactory.createResponseName(), content.schema);
                }
            }
        } else {
            this.responseBuilder.append(this.nameFactory.createResponseName(), {});
        }
    }
}
