import { constructor, MapFn } from '../utils/types';
import { RegistrationBuilder } from './RegistrationBuilder';

const id = <T>(value: T) => value;

export class RegistrationReflector {
    constructor(private metadataKey: string) {}

    findReducerOrCreate<T>(target: constructor<T>): MapFn<RegistrationBuilder<T>> {
        if (!Reflect.hasMetadata(this.metadataKey, target)) {
            Reflect.defineMetadata(this.metadataKey, id, target);
        }
        return Reflect.getMetadata(this.metadataKey, target);
    }

    addReducer(target: constructor<unknown>, reducer: MapFn<RegistrationBuilder>): void {
        Reflect.defineMetadata(this.metadataKey, reducer, target);
    }
}
