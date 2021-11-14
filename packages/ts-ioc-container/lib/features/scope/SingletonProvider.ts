import { IKeyedProvider, ProviderDecorator } from '../../core/IProvider';
import { IServiceLocator } from '../../core/IServiceLocator';
import { Box } from '../../helpers/types';

export class SingletonProvider<T> extends ProviderDecorator<T> {
    private instance: Box<T> | null = null;

    constructor(private readonly provider: IKeyedProvider<T>) {
        super(provider);
    }

    clone(): SingletonProvider<T> {
        return new SingletonProvider(this.provider.clone());
    }

    dispose(): void {
        this.instance = null;
        this.provider.dispose();
    }

    resolve(locator: IServiceLocator, ...args: any[]): T {
        if (this.instance === null) {
            const instance = this.provider.resolve(locator, ...args);
            this.instance = new Box<T>(instance);
        }

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        return this.instance!.value as T;
    }
}
