import { StringBuilder } from './StringBuilder';
import Handlebars from 'handlebars';
import fs from 'fs';
import path from 'path';
import { ConflictError } from './ConflictError';

const template = Handlebars.compile<{ operations: string[] }>(
    fs.readFileSync(path.resolve(__dirname, './ServerTemplate.hbs'), 'utf8'),
);

export class ServerBuilder implements StringBuilder {
    private operations: Set<string> = new Set<string>();

    addOperation(operationId: string) {
        ConflictError.assert(!!operationId, 'operationId is already exists');
        this.operations.add(operationId);
    }

    build(): string {
        return template({ operations: Array.from(this.operations.values()) });
    }
}
