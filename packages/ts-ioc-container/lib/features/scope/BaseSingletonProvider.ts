import { IProvider } from '../../core/IProvider';
import { Box } from '../../helpers/Box';
import { IServiceLocator } from '../../core/IServiceLocator';

export abstract class BaseSingletonProvider<T> implements IProvider<T> {
    private instance: Box<T> | null = null;

    constructor(private readonly decorated: IProvider<T>) {}

    abstract clone(): IProvider<T>;

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