import { Resolveable } from '../core/container/IContainer';
import { Box, constructor } from '../core/utils/types';
import { ProviderDecorator } from '../core/provider/ProviderDecorator';
import { IProvider } from '../core/provider/IProvider';
import { providerReflector } from '../core/provider/ProviderReflector';

export class SingletonProvider<T> extends ProviderDecorator<T> {
    private instance: Box<T> | null = null;

    constructor(private readonly provider: IProvider<T>) {
        super(provider);
    }

    clone(): SingletonProvider<T> {
        return new SingletonProvider(this.provider.clone());
    }

    dispose(): void {
        this.instance = null;
        this.provider.dispose();
    }

    resolve(container: Resolveable, ...args: any[]): T {
        if (this.instance === null) {
            const instance = this.provider.resolve(container, ...args);
            this.instance = new Box<T>(instance);
        }

        return this.instance.value as T;
    }
}

export const asSingleton: ClassDecorator = (target) => {
    const targetClass = target as any as constructor<unknown>;
    const fn = providerReflector.findReducerOrCreate(targetClass);
    providerReflector.addReducer(targetClass, (builder) => fn(builder).asSingleton());
};
