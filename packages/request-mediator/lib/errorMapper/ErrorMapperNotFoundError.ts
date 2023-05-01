export class ErrorMapperNotFoundError extends Error {
    constructor(message: string) {
        super(message);

        Object.setPrototypeOf(this, ErrorMapperNotFoundError.prototype);
    }
}
