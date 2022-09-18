import 'reflect-metadata';
import { inject, mapContext, resolve } from '../lib';

describe('resolve', function () {
    it('should map the context', function () {
        @mapContext((c: any) => c.person)
        class Person {
            constructor(
                @inject((p: any) => p.firstName) public firstName: string,
                @inject((p: any) => p.lastName) public lastName: string,
            ) {}
        }

        const person = resolve({ person: { firstName: 'John', lastName: 'Doe' } })(Person);
        expect(person.firstName).toBe('John');
        expect(person.lastName).toBe('Doe');
    });
});
