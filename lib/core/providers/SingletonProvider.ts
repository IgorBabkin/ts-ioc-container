import { IProvider } from './IProvider';
import { IServiceLocator } from '../IServiceLocator';

export class SingletonProvider<T> implements IProvider<T> {
    private instance: T | undefined;
    private isInstantiated = false;

    constructor(private decorated: IProvider<T>) {}

    clone(): IProvider<T> | undefined {
        return undefined;
    }

    dispose(): void {
        this.instance = undefined;
        this.decorated.dispose();
    }

    resolve(locator: IServiceLocator, ...args: any[]): T {
        if (!this.isInstantiated) {
            this.isInstantiated = true;
            this.instance = this.decorated.resolve(locator, ...args);
        }

        return this.instance as T;
    }
}
