import { constructor, IServiceLocator } from '../../IServiceLocator';
import { IServiceLocatorStrategy } from '../IServiceLocatorStrategy';
import { IMetadataCollector } from './IMetadataCollector';
import { InjectionItem } from './MetadataCollector';

export class IocServiceLocatorStrategy implements IServiceLocatorStrategy {
    constructor(private locator: IServiceLocator, private metadataCollector: IMetadataCollector) {}

    public resolveConstructor<T>(value: constructor<T>, ...deps: any[]): T {
        const injectionItems = this.metadataCollector.getMetadata(value);
        return new value(...injectionItems.map((item) => this.resolveItem(item)), ...deps);
    }

    private resolveItem({ token, type }: InjectionItem<any>): any {
        switch (type) {
            case 'instance':
                return this.locator.resolve(token);

            case 'factory':
                return (...args: any[]) => this.locator.resolve(token, ...args);
        }
    }

    public setLocator(locator: IServiceLocator): IServiceLocator {
        return (this.locator = locator);
    }

    public dispose(): void {
        this.locator = undefined;
    }
}
