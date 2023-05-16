import { DependencyMissingKeyError } from './DependencyMissingKeyError';
import { DependencyKey, IContainer, IContainerModule } from '../container/IContainer';
import { constructor, MapFn } from '../utils';
import { getProp, setProp } from '../reflection';
import { Provider } from '../provider/Provider';
import { IProvider } from '../provider/IProvider';

export const forKey = (key: DependencyKey): ClassDecorator => setProp('DependencyKey', key);

export class Registration implements IContainerModule {
    static fromClass(Target: constructor<unknown>): Registration {
        const dependencyKey = getProp<DependencyKey>(Target, 'DependencyKey');
        if (dependencyKey === undefined) {
            throw new DependencyMissingKeyError(`Pls provide dependency key for ${Target.name}`);
        }
        return new Registration(dependencyKey, Provider.fromClass(Target));
    }

    constructor(private key: DependencyKey, private provider: IProvider) {}

    map(...mappers: MapFn<IProvider>[]): this {
        this.provider = this.provider.map(...mappers);
        return this;
    }

    applyTo(container: IContainer): void {
        container.register(this.key, this.provider);
    }
}
