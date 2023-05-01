import { IErrorMapper } from './IErrorMapper';
import { DomainError } from './DomainError';

export abstract class DomainErrorMapper<Context = unknown> implements IErrorMapper<Context> {
    constructor(private topic: string) {}

    toDomain(error: unknown, meta: Context): DomainError {
        return this.createDomainError(error)
            .addMeta({ topic: this.topic, ...meta })
            .setParent(error);
    }

    protected abstract createDomainError(error: unknown): DomainError;
}
