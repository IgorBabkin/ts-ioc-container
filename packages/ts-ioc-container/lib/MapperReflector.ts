import { constructor, identity, MapFn, pipe } from './utils';

export class MapperReflector<P> {
    constructor(private metadataKey: string) {}
    getMapper<T>(target: constructor<T>): MapFn<P> | undefined {
        return Reflect.getMetadata(this.metadataKey, target);
    }

    appendMapper(target: constructor<unknown>, reducer: MapFn<P>): void {
        const current = Reflect.getMetadata(this.metadataKey, target) ?? identity;
        Reflect.defineMetadata(this.metadataKey, pipe(current, reducer), target);
    }
}
