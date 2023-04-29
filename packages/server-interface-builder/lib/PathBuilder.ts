import { OpenAPIV3 } from 'openapi-types';
import { ArgumentNullError } from './ArgumentNullError';
import { ContentBuilder } from './ContentBuilder';
import { StringBuilder } from './StringBuilder';
import { RequestBuilder } from './RequestBuilder';
import { NameFactory } from './NameFactory';
import { ServerBuilder } from './ServerBuilder';
import { BuilderComposer } from './BuilderComposer';

export class PathBuilder implements StringBuilder {
    constructor(private serverBuilder: ServerBuilder) {}

    private builderComposer = new BuilderComposer();

    append({ operationId, parameters, requestBody, responses }: OpenAPIV3.OperationObject): void {
        if (!operationId) {
            throw new ArgumentNullError('operationId is undefined');
        }

        this.serverBuilder.addOperation(operationId);

        const nameFactory = new NameFactory(operationId);

        const parametersBuilder = new RequestBuilder(nameFactory);

        if (parameters) {
            parametersBuilder.appendQuery(parameters);
        }

        if (requestBody) {
            parametersBuilder.appendBody(requestBody);
        }

        if (responses) {
            parametersBuilder.appendResponses(responses);
        }

        this.builderComposer.append(parametersBuilder);
    }

    build(): string {
        return this.builderComposer.build();
    }
}
