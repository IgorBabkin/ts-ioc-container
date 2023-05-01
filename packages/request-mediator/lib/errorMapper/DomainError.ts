export abstract class DomainError extends Error {
    name = 'DomainError';
    // eslint-disable-next-line @typescript-eslint/ban-types
    meta: object = {};
    parent: unknown | null = null;

    protected constructor(message: string) {
        super(message);

        Object.setPrototypeOf(this, DomainError.prototype);
    }

    // eslint-disable-next-line @typescript-eslint/ban-types
    addMeta(meta: object): this {
        this.meta = { ...this.meta, ...meta };
        return this;
    }

    setParent(parent: unknown): this {
        this.parent = parent;
        return this;
    }

    getStack(): string {
        return [this.stack, this.getParentStack()].filter(Boolean).join(' ');
    }

    private getParentStack(): string {
        if (this.parent instanceof DomainError) {
            return this.parent.getStack();
        }

        if (this.parent instanceof Error) {
            return this.parent.stack ?? '';
        }

        return '';
    }
}
