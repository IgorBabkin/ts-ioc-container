import { ProviderKey, Tag } from '../provider/IProvider';
import { ArgsFn } from '../provider/ArgsProvider';
import { RegistrationMissingKeyError } from './RegistrationMissingKeyError';
import { IContainer, IContainerModule } from '../container/IContainer';
import { ProviderBuilder } from '../provider/ProviderBuilder';
import { constructor } from '../utils';
import { getProp, setProp } from '../reflection';

export const forKey = (key: ProviderKey): ClassDecorator => setProp('provider-key', key);

export class Registration implements IContainerModule {
    static fromClass<T>(Target: constructor<T>): Registration {
        const providerKey = getProp<ProviderKey>(Target, 'provider-key');
        if (providerKey === undefined) {
            throw new RegistrationMissingKeyError(`Pls provide provider key for ${Target.name}`);
        }
        return new Registration(providerKey, ProviderBuilder.fromClass(Target));
    }

    constructor(private key: ProviderKey, private providerBuilder: ProviderBuilder) {}

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

    applyTo(container: IContainer): void {
        container.register(this.key, this.providerBuilder.build());
    }
}
