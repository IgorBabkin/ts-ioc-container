import { constructor, identity, MapFn, pipe } from '../utils';
import { Registration } from './Registration';

export class RegistrationReflector {
    private metadataKey = 'RegistrationReflector';
    getMapper<T>(target: constructor<T>): MapFn<Registration> | undefined {
        return Reflect.getMetadata(this.metadataKey, target);
    }

    appendMapper(target: constructor<unknown>, reducer: MapFn<Registration>): void {
        const current = Reflect.getMetadata(this.metadataKey, target) ?? identity;
        Reflect.defineMetadata(this.metadataKey, pipe(current, reducer), target);
    }
}
