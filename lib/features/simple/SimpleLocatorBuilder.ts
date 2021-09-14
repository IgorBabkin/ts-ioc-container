import { SimpleInjector } from './SimpleInjector';
import { LocatorBuilder } from '../LocatorBuilder';

export class SimpleLocatorBuilder extends LocatorBuilder {
    constructor() {
        super((l) => new SimpleInjector(l));
    }
}
