import { constructor, MapFn } from '../utils';
import { Registration } from './Registration';

const id = <T>(value: T) => value;

export class RegistrationReflector {
    private metadataKey = 'RegistrationReflector';
    getMapper<T>(target: constructor<T>): MapFn<Registration> {
        if (!Reflect.hasMetadata(this.metadataKey, target)) {
            Reflect.defineMetadata(this.metadataKey, id, target);
        }
        return Reflect.getMetadata(this.metadataKey, target);
    }

    setMapper(target: constructor<unknown>, reducer: MapFn<Registration>): void {
        Reflect.defineMetadata(this.metadataKey, reducer, target);
    }
}
