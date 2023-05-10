import { ProviderKey, Tag } from '../provider/IProvider';
import { ArgsFn } from '../provider/ArgsProvider';
import { RegistrationMissingKeyError } from './RegistrationMissingKeyError';
import { IContainer, IModule } from '../container/IContainer';
import { ProviderBuilder } from '../provider/ProviderBuilder';

export class Registration implements IModule {
    private key?: ProviderKey;

    constructor(private providerBuilder: ProviderBuilder) {}

    withArgs(...extraArgs: unknown[]): this {
        this.providerBuilder = this.providerBuilder.withArgs(...extraArgs);
        return this;
    }

    withArgsFn(argsFn: ArgsFn): this {
        this.providerBuilder = this.providerBuilder.withArgsFn(argsFn);
        return this;
    }

    perTags(...tags: Tag[]): this {
        this.providerBuilder = this.providerBuilder.perTags(...tags);
        return this;
    }

    asSingleton(...tags: Tag[]): this {
        this.providerBuilder = this.providerBuilder.asSingleton(...tags);
        return this;
    }

    forKey(key: ProviderKey): this {
        this.key = key;
        return this;
    }

    applyTo(container: IContainer): void {
        if (!this.key) {
            throw new RegistrationMissingKeyError('Pls provide registration keys for current providerBuilder');
        }
        container.register(this.key, this.providerBuilder.build());
    }
}
