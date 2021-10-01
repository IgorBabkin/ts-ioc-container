import { IProvider } from '../IProvider';
import { IServiceLocator } from '../../IServiceLocator';
import { Box } from '../Box';

export class LastScopeProvider<T> implements IProvider<T> {
    private instance: Box<T> | null = null;

    constructor(private readonly decorated: IProvider<T>) {}

    clone(): IProvider<T> {
        return new LastScopeProvider(this.decorated.clone());
    }

    dispose(): void {
        this.instance = null;
        this.decorated.dispose();
    }

    resolve(locator: IServiceLocator, ...args: any[]): T {
        if (this.instance === null) {
            const instance = this.decorated.resolve(locator, ...args);
            this.instance = new Box<T>(instance);
        }

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        return this.instance!.value as T;
    }
}
