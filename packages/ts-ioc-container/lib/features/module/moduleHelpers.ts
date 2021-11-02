import { IServiceLocator } from '../../core/IServiceLocator';
import { IProvider } from '../../core/IProvider';

export function registerModule(locator: IServiceLocator, deps: Record<string, IProvider<any>>): void {
    for (const [key, provider] of Object.entries(deps)) {
        locator.register(key, provider);
    }
}
