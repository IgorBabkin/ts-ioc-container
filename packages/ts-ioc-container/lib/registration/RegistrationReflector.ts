import { constructor, identity, MapFn } from '../utils';
import { RegistrationBuilder } from './RegistrationBuilder';

export class RegistrationReflector {
    private metadataKey = 'RegistrationReflector';
    getMapper<T>(target: constructor<T>): MapFn<RegistrationBuilder<T>> | undefined {
        return Reflect.getMetadata(this.metadataKey, target);
    }

    appendMapper<T>(target: constructor<T>, mapper: MapFn<RegistrationBuilder<T>>): void {
        const current: MapFn<RegistrationBuilder<T>> = Reflect.getMetadata(this.metadataKey, target) ?? identity;
        Reflect.defineMetadata(this.metadataKey, (builder: RegistrationBuilder<T>) => mapper(current(builder)), target);
    }
}
