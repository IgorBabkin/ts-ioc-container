import 'reflect-metadata';
import { InjectionPropertyDecorator, injectProperty, resolve } from '../lib';

type Env = {
    first_name: string;
    last_name: string;
};

const inject: InjectionPropertyDecorator<Env> = injectProperty;

class Person {
    @inject((env) => env.first_name) firstName: string;
    @inject((env) => env.last_name) lastName: string;
}

describe('injectProperty', function () {
    it('should inject into property', function () {
        const it = resolve({ first_name: 'john', last_name: 'due' })(Person);

        expect(it.firstName).toBe('john');
        expect(it.lastName).toBe('due');
    });
});
