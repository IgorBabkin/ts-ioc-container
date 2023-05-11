import { ProviderKey, ResolveDependency, Tag } from '../provider/IProvider';
import { ArgsFn } from '../provider/ArgsProvider';
import { RegistrationMissingKeyError } from './RegistrationMissingKeyError';
import { IContainer, IContainerModule } from '../container/IContainer';
import { ProviderBuilder } from '../provider/ProviderBuilder';
import { MapperReflector } from '../MapperReflector';
import { constructor, identity } from '../utils';

const reflector = new MapperReflector<Registration>('registration');

export class Registration implements IContainerModule {
    private key?: ProviderKey;

    static fromClass<T>(Target: constructor<T>): Registration {
        const map = reflector.getMapper(Target) ?? identity;
        return map(new Registration(ProviderBuilder.fromClass(Target)));
    }

    static fromValue<T>(value: T): Registration {
        return new Registration(ProviderBuilder.fromValue(value));
    }

    static fromFn<T>(fn: ResolveDependency<T>): Registration {
        return new Registration(ProviderBuilder.fromFn(fn));
    }

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

export const forKey =
    (key: ProviderKey): ClassDecorator =>
    (target: any) => {
        reflector.appendMapper(target, (registration) => registration.forKey(key));
    };
