import { constructor } from '../../helpers/types';
import { IServiceLocator } from '../../core/IServiceLocator';
import { IInjector } from '../../core/IInjector';

export class SimpleInjector implements IInjector {
    constructor(private readonly locator: IServiceLocator) {}

    resolve<T>(value: constructor<T>, ...deps: any[]): T {
        return new value(this.locator, ...deps);
    }

    dispose(): void {}
}
