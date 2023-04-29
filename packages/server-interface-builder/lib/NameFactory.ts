import { capitalize } from './utils';

export class NameFactory {
    constructor(private operationId: string) {}

    createPayloadName(): string {
        return `I${capitalize(this.operationId)}Payload`;
    }

    createResponseName(): string {
        return `I${capitalize(this.operationId)}Response`;
    }
}
